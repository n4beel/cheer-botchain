import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import { createPublicClient, createWalletClient, defineChain, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BOTCHAIN_ABI } from "../../lib/botchain/abi";
import { outcome, GoalState } from "../../lib/cheer";

const ANVIL_PORT = 8660;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

const localChain = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
});

describe("Cheer Integration Test", () => {
  let anvil: ChildProcess;

  const athleteAccount = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  const backerAAccount = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  const backerBAccount = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC_URL),
  });

  const athleteClient = createWalletClient({
    account: athleteAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const backerAClient = createWalletClient({
    account: backerAAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const backerBClient = createWalletClient({
    account: backerBAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  let cheerAddress: `0x${string}`;

  beforeAll(async () => {
    anvil = spawn("anvil", ["-p", String(ANVIL_PORT)], {
      stdio: "ignore",
    });

    // Wait for anvil
    for (let i = 0; i < 30; i++) {
      try {
        await publicClient.getBlockNumber();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const deployer = spawn(
      "forge",
      [
        "create",
        "contracts/src/Cheer.sol:Cheer",
        "--rpc-url",
        RPC_URL,
        "--private-key",
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "--broadcast",
      ],
      { cwd: process.cwd() }
    );

    let output = "";
    deployer.stdout.on("data", (d) => (output += d.toString()));
    deployer.stderr.on("data", (d) => (output += d.toString()));

    await new Promise<void>((resolve, reject) => {
      deployer.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Deploy failed: ${output}`));
      });
    });

    const match = output.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
    if (!match) throw new Error(`Could not find deployed address: ${output}`);
    cheerAddress = match[1] as `0x${string}`;
  }, 30000);

  afterAll(() => {
    if (anvil) {
      anvil.kill();
    }
  });

  it("handles the successful streak lifecycle: start -> back -> check-in all days -> settle -> withdraw", async () => {
    // 1. Start goal
    const startTx = await athleteClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "start",
      args: ["Daily Coding", "Write 100 lines of solid code daily", 3, 1],
    });
    await publicClient.waitForTransactionReceipt({ hash: startTx });

    const id = 1n;

    // 2. Backers back
    const backTxA = await backerAClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "back",
      args: [id],
      value: parseEther("1.0"),
    });
    await publicClient.waitForTransactionReceipt({ hash: backTxA });

    const backTxB = await backerBClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "back",
      args: [id],
      value: parseEther("2.0"),
    });
    await publicClient.waitForTransactionReceipt({ hash: backTxB });

    const gBefore = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "goalOf",
      args: [id],
    })) as { pledged: bigint; backers: number; startDay: bigint };

    expect(gBefore.backers).toBe(2);
    expect(gBefore.pledged).toBe(parseEther("3.0"));

    // Read current block timestamp to calculate startDay precisely
    const block0 = await publicClient.getBlock();
    const curDay = block0.timestamp / 86400n;
    const startDayGoal = curDay + 1n;

    // Advance timestamp directly to middle of startDay (Day 0)
    await publicClient.request({
      method: "evm_setNextBlockTimestamp" as any,
      params: [Number(startDayGoal * 86400n + 36000n)],
    });
    await publicClient.request({ method: "evm_mine" as any, params: [] });

    // Day 0 check in
    const checkTx0 = await athleteClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "checkIn",
      args: [id],
    });
    await publicClient.waitForTransactionReceipt({ hash: checkTx0 });

    // Day 1
    await publicClient.request({
      method: "evm_setNextBlockTimestamp" as any,
      params: [Number((startDayGoal + 1n) * 86400n + 36000n)],
    });
    await publicClient.request({ method: "evm_mine" as any, params: [] });

    const checkTx1 = await athleteClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "checkIn",
      args: [id],
    });
    await publicClient.waitForTransactionReceipt({ hash: checkTx1 });

    // Day 2
    await publicClient.request({
      method: "evm_setNextBlockTimestamp" as any,
      params: [Number((startDayGoal + 2n) * 86400n + 36000n)],
    });
    await publicClient.request({ method: "evm_mine" as any, params: [] });

    const checkTx2 = await athleteClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "checkIn",
      args: [id],
    });
    await publicClient.waitForTransactionReceipt({ hash: checkTx2 });

    // Advance 1 day past end of streak (Day 3)
    await publicClient.request({
      method: "evm_setNextBlockTimestamp" as any,
      params: [Number((startDayGoal + 3n) * 86400n + 36000n)],
    });
    await publicClient.request({ method: "evm_mine" as any, params: [] });

    // Check status
    const status = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "status",
      args: [id],
    })) as [bigint, bigint, number, boolean];

    const [today, startDay, dayNum, canSettle] = status;
    expect(canSettle).toBe(true);

    // Parity check with lib outcome
    const gCheck = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "goalOf",
      args: [id],
    })) as { doneBits: bigint; numDays: number };

    const libOutcome = outcome(gCheck.doneBits, gCheck.numDays, today, startDay);
    expect(libOutcome.state).toBe(GoalState.Succeeded);
    expect(libOutcome.canSettle).toBe(true);

    // Settle
    const settleTx = await backerAClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "settle",
      args: [id],
    });
    await publicClient.waitForTransactionReceipt({ hash: settleTx });

    const gAfter = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "goalOf",
      args: [id],
    })) as { state: number };
    expect(gAfter.state).toBe(1); // Succeeded

    // Athlete withdraws
    const athletePending = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "pending",
      args: [athleteAccount.address],
    })) as bigint;
    expect(athletePending).toBe(parseEther("3.0"));

    const withdrawTx = await athleteClient.writeContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "withdraw",
      args: [],
    });
    await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

    const athletePendingAfter = (await publicClient.readContract({
      address: cheerAddress,
      abi: BOTCHAIN_ABI,
      functionName: "pending",
      args: [athleteAccount.address],
    })) as bigint;
    expect(athletePendingAfter).toBe(0n);
  });
});
