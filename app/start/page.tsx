"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { BOTCHAIN_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { assertActiveChain, checkedWrite, waitSuccess } from "@/lib/useChainWrite";
import { formatCheerError } from "@/lib/errors";

export default function StartStreakPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const deployment = getDeployment(activeBotChain.id);

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [numDays, setNumDays] = useState("14");
  const [leadDays, setLeadDays] = useState("2");
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const titleBytes = new TextEncoder().encode(title).length;
  const goalBytes = new TextEncoder().encode(goal).length;
  const parsedNumDays = parseInt(numDays, 10) || 0;
  const parsedLeadDays = parseInt(leadDays, 10) || 0;

  // Validation
  let validationError: string | null = null;
  if (!title.trim()) {
    validationError = "Title cannot be empty.";
  } else if (titleBytes > 64) {
    validationError = `Title must be ≤ 64 bytes (currently ${titleBytes}).`;
  } else if (!goal.trim()) {
    validationError = "Goal description cannot be empty.";
  } else if (goalBytes > 200) {
    validationError = `Goal description must be ≤ 200 bytes (currently ${goalBytes}).`;
  } else if (parsedNumDays < 3 || parsedNumDays > 60) {
    validationError = "Streak duration must be between 3 and 60 days.";
  } else if (parsedLeadDays < 1 || parsedLeadDays > 14) {
    validationError = "Lead days must be between 1 and 14 days.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError || !walletClient || !publicClient || !deployment?.address || !isConnected) return;

    try {
      setSubmitting(true);
      setTxError(null);
      await assertActiveChain(walletClient);

      const hash = await checkedWrite(walletClient, publicClient, {
        address: deployment.address,
        abi: BOTCHAIN_ABI,
        functionName: "start",
        args: [title.trim(), goal.trim(), parsedNumDays, parsedLeadDays],
      });

      await waitSuccess(publicClient, hash);
      router.push("/");
    } catch (err: any) {
      console.error("Start failed:", err);
      setTxError(formatCheerError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-[var(--text-primary)]">
            Declare a Daily Streak
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Commit to checking in every single UTC day. Backers pledge funds to reward your consistency.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Panel className="p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Streak Title
                </label>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {titleBytes}/64 bytes
                </span>
              </div>
              <Input
                type="text"
                placeholder="e.g. 5am Morning Run, 30m Meditation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={64}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Goal Description
                </label>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {goalBytes}/200 bytes
                </span>
              </div>
              <textarea
                rows={3}
                placeholder="Describe your daily habit and what you promise to show up for each day."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full border border-[var(--border-default)] rounded bg-[var(--bg-elevated)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                  Duration (3–60 Days)
                </label>
                <Input
                  type="number"
                  min="3"
                  max="60"
                  step="any"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                  required
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  How many consecutive days to check in
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                  Backing Window (1–14 Lead Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="14"
                  step="any"
                  value={leadDays}
                  onChange={(e) => setLeadDays(e.target.value)}
                  required
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  Days before streak begins to gather backers
                </span>
              </div>
            </div>
          </Panel>

          {(validationError || txError) && (
            <Panel className="p-3 border-[var(--danger)] text-xs text-[var(--danger)]">
              {validationError || txError}
            </Panel>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || Boolean(validationError) || !isConnected}
            >
              {submitting ? "Declaring..." : "Start Streak"}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
