import { spawn } from "node:child_process";
import { createPublicClient, createWalletClient, defineChain, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BOTCHAIN_ABI } from "../lib/botchain/abi.js";

const PORT = 8760;
const RPC_URL = `http://127.0.0.1:${PORT}`;

const localChain = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
});

async function main() {
  console.log(`Starting local Anvil on port ${PORT}...`);
  const anvil = spawn("anvil", ["-p", String(PORT)], { stdio: "ignore" });

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC_URL),
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

  console.log("Deploying Cheer contract...");
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

  await new Promise((resolve, reject) => {
    deployer.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Deploy failed: ${output}`));
    });
  });

  const match = output.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
  if (!match) throw new Error("Could not find address");
  const contractAddress = match[1];
  console.log(`Cheer deployed to: ${contractAddress}`);

  // Seeding roles
  const athlete = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  const backerA = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  const backerB = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

  const athleteClient = createWalletClient({ account: athlete, chain: localChain, transport: http(RPC_URL) });
  const backerAClient = createWalletClient({ account: backerA, chain: localChain, transport: http(RPC_URL) });
  const backerBClient = createWalletClient({ account: backerB, chain: localChain, transport: http(RPC_URL) });

  // Seed goals per §5
  // Goal 1: Backing open with backers
  const t1 = await athleteClient.writeContract({
    address: contractAddress,
    abi: BOTCHAIN_ABI,
    functionName: "start",
    args: ["Morning Run", "Run 5 miles every morning before 7am", 14, 3],
  });
  await publicClient.waitForTransactionReceipt({ hash: t1 });

  await backerAClient.writeContract({
    address: contractAddress,
    abi: BOTCHAIN_ABI,
    functionName: "back",
    args: [1n],
    value: parseEther("2.5"),
  });
  await backerBClient.writeContract({
    address: contractAddress,
    abi: BOTCHAIN_ABI,
    functionName: "back",
    args: [1n],
    value: parseEther("5.0"),
  });

  // Goal 2: Fresh new goal
  const t2 = await athleteClient.writeContract({
    address: contractAddress,
    abi: BOTCHAIN_ABI,
    functionName: "start",
    args: ["Cold Plunge", "3 minutes daily at 45 degrees", 30, 2],
  });
  await publicClient.waitForTransactionReceipt({ hash: t2 });

  console.log("Local stack ready! Press Ctrl+C to terminate.");
  process.on("SIGINT", () => {
    anvil.kill();
    process.exit();
  });
}

main().catch(console.error);
