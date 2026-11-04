"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatEther, parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { Thermometer } from "@/components/thermometer/Thermometer";
import { CrowdVisualization } from "@/components/thermometer/CrowdVisualization";
import { BOTCHAIN_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { assertActiveChain, checkedWrite, waitSuccess } from "@/lib/useChainWrite";
import { Goal, GoalState, dayIndex, dayNumber, outcome } from "@/lib/cheer";
import { formatCheerError } from "@/lib/errors";

export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const goalId = BigInt(resolvedParams.id);

  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const deployment = getDeployment(activeBotChain.id);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalText, setGoalText] = useState<string | null>(null);
  const [userPledge, setUserPledge] = useState<bigint>(0n);
  const [isRefunded, setIsRefunded] = useState<boolean>(false);
  const [backersList, setBackersList] = useState<{ who: `0x${string}`; amount: bigint }[]>([]);
  const [nowDay, setNowDay] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Actions state
  const [pledgeAmt, setPledgeAmt] = useState("0.5");
  const [backing, setBacking] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [settling, setSettling] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  async function loadGoalData() {
    if (!publicClient || !deployment?.address) return;
    try {
      setLoadError(null);

      const [block, gData, pledge, refunded] = await Promise.all([
        publicClient.getBlock(),
        publicClient.readContract({
          address: deployment.address,
          abi: BOTCHAIN_ABI,
          functionName: "goalOf",
          args: [goalId],
        }) as Promise<{
          athlete: `0x${string}`;
          startDay: bigint;
          numDays: number;
          state: number;
          goalBlock: number;
          backers: number;
          pledged: bigint;
          doneBits: bigint;
          title: string;
        }>,
        address
          ? (publicClient.readContract({
              address: deployment.address,
              abi: BOTCHAIN_ABI,
              functionName: "pledgeOf",
              args: [goalId, address],
            }) as Promise<bigint>)
          : Promise.resolve(0n),
        address
          ? (publicClient.readContract({
              address: deployment.address,
              abi: BOTCHAIN_ABI,
              functionName: "isRefunded",
              args: [goalId, address],
            }) as Promise<boolean>)
          : Promise.resolve(false),
      ]);

      const currentDay = dayIndex(block.timestamp);
      setNowDay(currentDay);

      setGoal({
        athlete: gData.athlete,
        startDay: gData.startDay,
        numDays: gData.numDays,
        state: gData.state as GoalState,
        goalBlock: gData.goalBlock,
        backers: gData.backers,
        pledged: gData.pledged,
        doneBits: gData.doneBits,
        title: gData.title,
      });

      setUserPledge(pledge);
      setIsRefunded(refunded);

      // Attempt to read goal text from Started event
      try {
        const logs = await publicClient.getLogs({
          address: deployment.address,
          event: {
            type: "event",
            name: "Started",
            inputs: [
              { name: "id", type: "uint256", indexed: true },
              { name: "athlete", type: "address", indexed: true },
              { name: "title", type: "string", indexed: false },
              { name: "goal", type: "string", indexed: false },
              { name: "numDays", type: "uint16", indexed: false },
              { name: "startDay", type: "uint64", indexed: false },
            ],
          },
          args: { id: goalId },
          fromBlock: BigInt(gData.goalBlock),
          toBlock: BigInt(gData.goalBlock),
        });

        if (logs.length > 0 && (logs[0] as any).args?.goal) {
          setGoalText((logs[0] as any).args.goal);
        }
      } catch {
        // Fallback: goal text unavailable from log
      }

      // Read Backed events to build crowd visualization
      try {
        const backedLogs = await publicClient.getLogs({
          address: deployment.address,
          event: {
            type: "event",
            name: "Backed",
            inputs: [
              { name: "id", type: "uint256", indexed: true },
              { name: "who", type: "address", indexed: true },
              { name: "amount", type: "uint128", indexed: false },
              { name: "pledged", type: "uint128", indexed: false },
            ],
          },
          args: { id: goalId },
          fromBlock: BigInt(gData.goalBlock),
        });

        const pledgesMap = new Map<string, bigint>();
        for (const log of backedLogs) {
          const who = (log as any).args.who as `0x${string}`;
          const amt = (log as any).args.amount as bigint;
          pledgesMap.set(who, (pledgesMap.get(who) || 0n) + amt);
        }

        const list = Array.from(pledgesMap.entries()).map(([who, amount]) => ({
          who: who as `0x${string}`,
          amount,
        }));
        setBackersList(list);
      } catch {
        // Crowd events fallback
      }
    } catch (err: any) {
      console.error("Failed to load goal:", err);
      setLoadError(err?.message || "Streak not found");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoalData();
  }, [deployment?.address, address, goalId]);

  if (loading) {
    return (
      <PageShell>
        <div className="py-20 flex justify-center">
          <Spinner />
        </div>
      </PageShell>
    );
  }

  if (loadError || !goal) {
    return (
      <PageShell>
        <Panel className="p-6 text-center border-[var(--danger)]">
          <h2 className="text-lg font-bold text-[var(--danger)] mb-2">Error</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {loadError || "Streak not found"}
          </p>
          <Link href="/">
            <Button variant="ghost">Back to Streaks</Button>
          </Link>
        </Panel>
      </PageShell>
    );
  }

  const isAthlete = address?.toLowerCase() === goal.athlete.toLowerCase();
  const isBackingOpen = goal.state === GoalState.Backing && nowDay < goal.startDay;
  const isRunning =
    goal.state === GoalState.Backing &&
    nowDay >= goal.startDay &&
    nowDay < goal.startDay + BigInt(goal.numDays);

  const dayNum = dayNumber(goal.startDay, nowDay);
  const currentDayIndex = isRunning ? dayNum - 1 : -1;
  const alreadyCheckedInToday =
    currentDayIndex >= 0 &&
    ((goal.doneBits >> BigInt(currentDayIndex)) & 1n) === 1n;

  // Outcome computation
  const evalOutcome = outcome(goal.doneBits, goal.numDays, nowDay, goal.startDay);
  const canSettleNow = goal.state === GoalState.Backing && evalOutcome.canSettle;

  // Handlers
  async function handleBack() {
    if (!walletClient || !publicClient || !deployment?.address || !isConnected) return;
    try {
      setBacking(true);
      setActionError(null);
      setTxSuccess(null);
      await assertActiveChain(walletClient);

      const val = parseEther(pledgeAmt);
      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "back",
        args: [goalId],
        value: val,
      });

      await waitSuccess(publicClient, hash);
      setTxSuccess(`Successfully pledged ${pledgeAmt} BOT to this streak!`);
      await loadGoalData();
    } catch (err: any) {
      console.error("Backing failed:", err);
      setActionError(formatCheerError(err));
    } finally {
      setBacking(false);
    }
  }

  async function handleCheckIn() {
    if (!walletClient || !publicClient || !deployment?.address || !isConnected) return;
    try {
      setCheckingIn(true);
      setActionError(null);
      setTxSuccess(null);
      await assertActiveChain(walletClient);

      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "checkIn",
        args: [goalId],
      });

      await waitSuccess(publicClient, hash);
      setTxSuccess("Check-in confirmed for today! Mercury is rising.");
      await loadGoalData();
    } catch (err: any) {
      console.error("Check-in failed:", err);
      setActionError(formatCheerError(err));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleSettle() {
    if (!walletClient || !publicClient || !deployment?.address || !isConnected) return;
    try {
      setSettling(true);
      setActionError(null);
      setTxSuccess(null);
      await assertActiveChain(walletClient);

      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "settle",
        args: [goalId],
      });

      await waitSuccess(publicClient, hash);
      setTxSuccess("Streak outcome finalized!");
      await loadGoalData();
    } catch (err: any) {
      console.error("Settle failed:", err);
      setActionError(formatCheerError(err));
    } finally {
      setSettling(false);
    }
  }

  async function handleRefund() {
    if (!walletClient || !publicClient || !deployment?.address || !isConnected) return;
    try {
      setRefunding(true);
      setActionError(null);
      setTxSuccess(null);
      await assertActiveChain(walletClient);

      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "refund",
        args: [goalId],
      });

      await waitSuccess(publicClient, hash);
      setTxSuccess(`Successfully refunded ${formatEther(userPledge)} BOT to your wallet!`);
      await loadGoalData();
    } catch (err: any) {
      console.error("Refund failed:", err);
      setActionError(formatCheerError(err));
    } finally {
      setRefunding(false);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:underline flex items-center gap-1 mb-2"
          >
            ← Back to all streaks
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-[var(--text-primary)]">
                #{goalId.toString()} {goal.title}
              </h1>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                Athlete: {goal.athlete} • {goal.numDays} Days Total
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-mono text-lg px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded font-bold text-[var(--accent)]">
                {formatEther(goal.pledged)} BOT Waiting
              </span>
            </div>
          </div>
        </div>

        {/* Goal description & Athlete status banner */}
        <Panel className="p-5">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
            Goal Declaration
          </h2>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {goalText || "(Goal description logged at creation block)"}
          </p>
        </Panel>

        {/* Thermometer & Crowd Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Thermometer Tube Panel */}
          <Panel className="p-6 md:col-span-1 flex flex-col items-center">
            <Thermometer
              numDays={goal.numDays}
              doneBits={goal.doneBits}
              startDay={goal.startDay}
              nowDay={nowDay}
              state={goal.state}
              compact={false}
            />
          </Panel>

          {/* Action & Crowd details */}
          <div className="md:col-span-2 space-y-4">
            {/* Feedback messages */}
            {actionError && (
              <Panel className="p-3 border-[var(--danger)] text-sm text-[var(--danger)]">
                {actionError}
              </Panel>
            )}
            {txSuccess && (
              <Panel className="p-3 border-[var(--success)] text-sm text-[var(--success)]">
                {txSuccess}
              </Panel>
            )}

            {/* Athlete Check-In Card */}
            {isAthlete && isRunning && (
              <Panel highlight className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-[var(--accent)]">
                    Athlete Action (Day {dayNum} of {goal.numDays})
                  </span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    UTC Day {nowDay.toString()}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  {alreadyCheckedInToday
                    ? "You have already completed your check-in for today! Rest up for tomorrow."
                    : "Check in to prove you showed up today and keep your streak alive."}
                </p>

                <Button
                  variant="primary"
                  onClick={handleCheckIn}
                  disabled={checkingIn || alreadyCheckedInToday || !isConnected}
                  className="w-full justify-center"
                >
                  {checkingIn
                    ? "Recording..."
                    : alreadyCheckedInToday
                    ? "Checked In Today ✓"
                    : "Check In For Today"}
                </Button>
              </Panel>
            )}

            {/* Back Streak Card */}
            {isBackingOpen && (
              <Panel className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Back this Streak
                  </h3>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    Starts in {Math.abs(dayNum)} days
                  </span>
                </div>

                {isAthlete ? (
                  <p className="text-xs text-[var(--text-muted)] py-2">
                    You cannot back your own streak. Share with friends or fans to gather pledges!
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-[var(--text-muted)]">
                      Pledge BOT to cheer on {goal.athlete.slice(0, 6)}...{goal.athlete.slice(-4)}.
                      They are paid only if they check in on all {goal.numDays} days.
                    </p>

                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        value={pledgeAmt}
                        onChange={(e) => setPledgeAmt(e.target.value)}
                        disabled={backing}
                      />
                      <Button
                        variant="primary"
                        onClick={handleBack}
                        disabled={backing || !isConnected || parseFloat(pledgeAmt) < 0.01}
                      >
                        {backing ? "Pledging..." : "Pledge BOT"}
                      </Button>
                    </div>

                    {userPledge > 0n && (
                      <div className="text-xs text-[var(--accent)] font-semibold mt-1">
                        Your total pledge: {formatEther(userPledge)} BOT
                      </div>
                    )}
                  </>
                )}
              </Panel>
            )}

            {/* Settle Action */}
            {canSettleNow && (
              <Panel className="p-5 space-y-3 border-[var(--warning)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--warning)]">
                  Streak Settle Available
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {evalOutcome.state === GoalState.Failed
                    ? `A day was missed (Day ${evalOutcome.firstMissDay + 1}). Settle to break the thermometer and allow backers to refund.`
                    : "All days completed! Settle to reward the athlete with the full pot."}
                </p>

                <Button
                  variant="primary"
                  onClick={handleSettle}
                  disabled={settling || !isConnected}
                >
                  {settling ? "Settling..." : "Settle Outcome"}
                </Button>
              </Panel>
            )}

            {/* Refund Action for Failed Streak */}
            {goal.state === GoalState.Failed && userPledge > 0n && (
              <Panel className="p-5 space-y-3 border-[var(--danger)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--danger)]">
                  Claim Pledge Refund
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  The streak was not completed. You can take your {formatEther(userPledge)} BOT pledge back.
                </p>

                {isRefunded ? (
                  <span className="text-xs text-[var(--success)] font-bold">
                    ✓ Refunded to your wallet
                  </span>
                ) : (
                  <Button
                    variant="danger"
                    onClick={handleRefund}
                    disabled={refunding || !isConnected}
                  >
                    {refunding ? "Refunding..." : `Refund ${formatEther(userPledge)} BOT`}
                  </Button>
                )}
              </Panel>
            )}

            {/* Crowd visualization */}
            <CrowdVisualization pledges={backersList} />
          </div>
        </div>

        {/* Educational copy */}
        <Panel className="p-4 text-xs text-[var(--text-muted)] space-y-1">
          <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            What a check-in is
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>It proves a wallet showed up, not that the habit happened. Back people you trust.</li>
            <li>One missed UTC day ends it. If it ends, you get your pledge back.</li>
            <li>The athlete can&apos;t back themselves, but can use other wallets.</li>
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}
