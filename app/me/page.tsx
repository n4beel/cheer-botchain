"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { BOTCHAIN_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { assertActiveChain, checkedWrite, waitSuccess } from "@/lib/useChainWrite";
import { Goal, GoalState } from "@/lib/cheer";
import { formatCheerError } from "@/lib/errors";

export default function MePage() {
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const deployment = getDeployment(activeBotChain.id);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [pendingWinnings, setPendingWinnings] = useState<bigint>(0n);
  const [myStreaks, setMyStreaks] = useState<{ id: bigint; goal: Goal }[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  async function loadUserData() {
    if (!publicClient || !deployment?.address || !address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [pending, count] = await Promise.all([
        publicClient.readContract({
          address: deployment.address,
          abi: BOTCHAIN_ABI,
          functionName: "pending",
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: deployment.address,
          abi: BOTCHAIN_ABI,
          functionName: "goalCount",
        }) as Promise<bigint>,
      ]);

      setPendingWinnings(pending);

      // Fetch user's streaks via byAthlete
      const result = (await publicClient.readContract({
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "byAthlete",
        args: [address, 0n, 50n],
      })) as [
        readonly bigint[],
        readonly {
          athlete: `0x${string}`;
          startDay: bigint;
          numDays: number;
          state: number;
          goalBlock: number;
          backers: number;
          pledged: bigint;
          doneBits: bigint;
          title: string;
        }[],
        bigint
      ];

      const [ids, rawGoals] = result;
      const list: { id: bigint; goal: Goal }[] = [];
      for (let i = 0; i < rawGoals.length; i++) {
        const g = rawGoals[i];
        list.push({
          id: ids[i],
          goal: {
            athlete: g.athlete,
            startDay: g.startDay,
            numDays: g.numDays,
            state: g.state as GoalState,
            goalBlock: g.goalBlock,
            backers: g.backers,
            pledged: g.pledged,
            doneBits: g.doneBits,
            title: g.title,
          },
        });
      }

      setMyStreaks(list);
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUserData();
  }, [deployment?.address, address]);

  async function handleWithdraw() {
    if (!walletClient || !publicClient || !deployment?.address || !isConnected || pendingWinnings <= 0n) return;
    try {
      setWithdrawing(true);
      setWithdrawMsg(null);
      await assertActiveChain(walletClient);

      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "withdraw",
      });

      await waitSuccess(publicClient, hash);
      setWithdrawMsg("Streak earnings successfully withdrawn to your wallet!");
      await loadUserData();
    } catch (err: any) {
      console.error("Withdraw failed:", err);
      setWithdrawMsg(formatCheerError(err));
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-[var(--text-primary)]">
            My Account & Streaks
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track your declared streaks, earned winnings, and claims.
          </p>
        </div>

        {/* Athlete Earnings Card */}
        <Panel highlight className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                Earned Streak Winnings
              </h2>
              <div className="font-mono text-3xl font-bold text-[var(--accent)] mt-1">
                {formatEther(pendingWinnings)} BOT
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Pledges awarded from your successfully completed streaks.
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                onClick={handleWithdraw}
                disabled={withdrawing || pendingWinnings <= 0n || !isConnected}
              >
                {withdrawing ? "Withdrawing..." : "Withdraw Winnings"}
              </Button>
            </div>
          </div>

          {withdrawMsg && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
              {withdrawMsg}
            </div>
          )}
        </Panel>

        {/* Your Declared Streaks */}
        <div>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-3">
            Streaks Declared by You
          </h2>

          {!isConnected ? (
            <Panel className="p-6 text-center text-sm text-[var(--text-muted)]">
              Connect your wallet to view your streaks.
            </Panel>
          ) : loading ? (
            <div className="py-12 flex justify-center">
              <Spinner />
            </div>
          ) : myStreaks.length === 0 ? (
            <Panel className="p-6 text-center text-sm text-[var(--text-muted)]">
              You haven&apos;t declared any streaks yet.
              <div className="mt-3">
                <Link href="/start">
                  <Button variant="primary">Start your first streak</Button>
                </Link>
              </div>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myStreaks.map(({ id, goal }) => (
                <Panel key={id.toString()} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/goal/${id.toString()}`}
                        className="font-bold text-lg hover:underline text-[var(--text-primary)]"
                      >
                        #{id.toString()} {goal.title}
                      </Link>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                        {formatEther(goal.pledged)} BOT
                      </span>
                    </div>

                    <div className="text-xs text-[var(--text-muted)] mb-3">
                      {goal.numDays} Days • Status:{" "}
                      {goal.state === GoalState.Succeeded ? (
                        <span className="text-[var(--success)] font-bold">Succeeded</span>
                      ) : goal.state === GoalState.Failed ? (
                        <span className="text-[var(--danger)] font-bold">Failed</span>
                      ) : (
                        <span className="text-[var(--accent)] font-bold">Active / Backing</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
                    <Link href={`/goal/${id.toString()}`}>
                      <Button variant="ghost" className="text-xs py-1 px-3">
                        View Streak →
                      </Button>
                    </Link>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
