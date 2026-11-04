"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { usePublicClient } from "wagmi";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { Thermometer } from "@/components/thermometer/Thermometer";
import { BOTCHAIN_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { Goal, GoalState, dayIndex, dayNumber } from "@/lib/cheer";

export default function HomePage() {
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const deployment = getDeployment(activeBotChain.id);
  const [goals, setGoals] = useState<{ id: bigint; goal: Goal }[]>([]);
  const [nowDay, setNowDay] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!publicClient || !deployment?.address) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const [block, count] = await Promise.all([
          publicClient.getBlock(),
          publicClient.readContract({
            address: deployment.address,
            abi: BOTCHAIN_ABI,
            functionName: "goalCount",
          }) as Promise<bigint>,
        ]);

        const currentDay = dayIndex(block.timestamp);
        if (!cancelled) setNowDay(currentDay);

        if (count === 0n) {
          if (!cancelled) {
            setGoals([]);
            setLoading(false);
          }
          return;
        }

        const fetchCount = count > 50n ? 50n : count;
        const offset = count > 50n ? count - 50n : 0n;

        const result = (await publicClient.readContract({
          address: deployment.address,
          abi: BOTCHAIN_ABI,
          functionName: "latest",
          args: [offset, fetchCount],
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
        for (let i = rawGoals.length - 1; i >= 0; i--) {
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

        if (!cancelled) {
          setGoals(list);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load goals:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load streaks");
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [deployment?.address]);

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Banner with tagline & limitations */}
        <Panel highlight className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl tracking-wide text-[var(--accent)]">
                Cheer
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
                Back someone&apos;s streak. They&apos;re paid only if they keep it.
              </p>
            </div>
            <Link href="/start">
              <Button variant="primary">Start a Streak</Button>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1">
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              What a check-in is
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>It proves a wallet showed up, not that the habit happened. Back people you trust.</li>
              <li>One missed UTC day ends it. If it ends, you get your pledge back.</li>
              <li>The athlete can&apos;t back themselves, but can use other wallets.</li>
            </ul>
          </div>
        </Panel>

        {/* Streaks row */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <Panel className="p-4 border-[var(--danger)] text-sm text-[var(--danger)]">
            {error}
          </Panel>
        ) : goals.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-3">No active streaks yet.</p>
            <Link href="/start">
              <Button variant="primary">Declare the first streak</Button>
            </Link>
          </Panel>
        ) : (
          <div>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-3">
              All Streaks (Thermometer Overview)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map(({ id, goal }) => {
                const dayNum = dayNumber(goal.startDay, nowDay);
                const isBackingOpen = goal.state === GoalState.Backing && nowDay < goal.startDay;
                const isRunning =
                  goal.state === GoalState.Backing &&
                  nowDay >= goal.startDay &&
                  nowDay < goal.startDay + BigInt(goal.numDays);

                return (
                  <Panel key={id.toString()} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link
                          href={`/goal/${id.toString()}`}
                          className="hover:underline font-bold text-lg text-[var(--text-primary)]"
                        >
                          #{id.toString()} {goal.title}
                        </Link>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                          {formatEther(goal.pledged)} BOT
                        </span>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mb-3">
                        <span>Athlete: {goal.athlete.slice(0, 6)}...{goal.athlete.slice(-4)}</span>
                        <span>•</span>
                        <span>{goal.backers} backer{goal.backers === 1 ? "" : "s"}</span>
                      </div>

                      {/* Small Thermometer */}
                      <Thermometer
                        numDays={goal.numDays}
                        doneBits={goal.doneBits}
                        startDay={goal.startDay}
                        nowDay={nowDay}
                        state={goal.state}
                        compact={true}
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div>
                        {goal.state === GoalState.Succeeded ? (
                          <span className="text-[var(--success)] font-semibold">✓ Streak Completed</span>
                        ) : goal.state === GoalState.Failed ? (
                          <span className="text-[var(--danger)] font-semibold">✗ Streak Failed</span>
                        ) : isBackingOpen ? (
                          <span className="text-[var(--accent)] font-semibold">
                            Backing open (starts in {Math.abs(dayNum)}d)
                          </span>
                        ) : isRunning ? (
                          <span className="text-[var(--text-primary)] font-semibold">
                            Day {dayNum} of {goal.numDays}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Awaiting settlement</span>
                        )}
                      </div>

                      <Link href={`/goal/${id.toString()}`}>
                        <Button variant="ghost" className="text-xs py-1 px-3">
                          View Streak →
                        </Button>
                      </Link>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
