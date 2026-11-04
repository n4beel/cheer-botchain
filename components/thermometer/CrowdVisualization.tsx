"use client";

import React from "react";
import { formatEther } from "viem";
import { crowd } from "@/lib/cheer";

interface CrowdVisualizationProps {
  pledges: { who: `0x${string}`; amount: bigint }[];
}

export function CrowdVisualization({ pledges }: CrowdVisualizationProps) {
  const bubbles = crowd(pledges);

  if (bubbles.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded p-4">
        No backers yet. Be the first to cheer this streak!
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
        The Crowd ({bubbles.length} Backers)
      </div>
      <div className="flex flex-wrap gap-2 items-center p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        {bubbles.map((b, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-1.5 bg-[var(--bg-surface)] px-2.5 py-1 rounded-full border border-[var(--border-default)] shadow-xs"
            title={`${b.who}: ${formatEther(b.amount)} BOT`}
          >
            <div
              className="rounded-full bg-[var(--accent)]"
              style={{
                width: `${Math.max(8, b.radius)}px`,
                height: `${Math.max(8, b.radius)}px`,
              }}
            />
            <span className="text-[11px] font-mono text-[var(--text-primary)]">
              {b.who.slice(0, 6)}...{b.who.slice(-4)}
            </span>
            <span className="text-[11px] font-mono font-bold text-[var(--accent)]">
              {formatEther(b.amount)} BOT
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
