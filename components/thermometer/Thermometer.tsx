"use client";

import React, { useState } from "react";
import { GoalState } from "@/lib/cheer";

interface ThermometerProps {
  numDays: number;
  doneBits: bigint;
  startDay: bigint;
  nowDay: bigint;
  state: GoalState;
  compact?: boolean;
}

export function Thermometer({
  numDays,
  doneBits,
  startDay,
  nowDay,
  state,
  compact = false,
}: ThermometerProps) {
  const [showTable, setShowTable] = useState(false);

  // Calculate day completion status
  const days = [];
  let checkedCount = 0;
  for (let i = 0; i < numDays; i++) {
    const isDone = ((doneBits >> BigInt(i)) & 1n) === 1n;
    if (isDone) checkedCount++;
    const targetDay = startDay + BigInt(i);
    const isPast = nowDay > targetDay;
    const isToday = nowDay === targetDay;
    const isFuture = nowDay < targetDay;

    days.push({
      dayIndex: i,
      dayNum: i + 1,
      isDone,
      isPast,
      isToday,
      isFuture,
    });
  }

  const fraction = numDays > 0 ? checkedCount / numDays : 0;
  const isFailed = state === GoalState.Failed;
  const isSucceeded = state === GoalState.Succeeded;

  // Dimensions
  const width = compact ? 260 : 120;
  const height = compact ? 54 : 320;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
          Streak Progress ({checkedCount}/{numDays} Days)
        </span>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="text-xs text-[var(--accent)] underline hover:opacity-80 transition cursor-pointer"
        >
          {showTable ? "View visual" : "View accessible table"}
        </button>
      </div>

      {showTable ? (
        <div className="w-full max-h-56 overflow-y-auto border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] p-2">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
              <tr>
                <th className="py-1 px-2">Day</th>
                <th className="py-1 px-2">Timeline</th>
                <th className="py-1 px-2">Check-in Status</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.dayIndex} className="border-b border-[var(--border-subtle)]/30">
                  <td className="py-1 px-2 font-mono">Day {d.dayNum}</td>
                  <td className="py-1 px-2">
                    {d.isToday ? (
                      <span className="text-[var(--accent)] font-bold">Today</span>
                    ) : d.isPast ? (
                      <span className="text-[var(--text-muted)]">Past</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Upcoming</span>
                    )}
                  </td>
                  <td className="py-1 px-2">
                    {d.isDone ? (
                      <span className="text-[var(--success)] font-semibold">✓ Checked In</span>
                    ) : d.isPast ? (
                      <span className="text-[var(--danger)] font-semibold">✗ Missed</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">— Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : compact ? (
        /* Horizontal Thermometer for Compact / Mobile cards */
        <div className="w-full relative py-2">
          <div className="h-6 w-full rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--border-default)] overflow-hidden relative flex items-center">
            {/* Mercury bar */}
            <div
              className="h-full transition-all duration-300 rounded-l-full"
              style={{
                width: `${fraction * 100}%`,
                backgroundColor: isFailed ? "var(--danger)" : isSucceeded ? "var(--success)" : "var(--accent)",
              }}
            />
            {/* Ticks */}
            <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
              {Array.from({ length: Math.min(numDays, 20) }).map((_, idx) => (
                <div key={idx} className="w-[1.5px] h-3 bg-[var(--border-subtle)]/60" />
              ))}
            </div>
          </div>
          {isFailed && (
            <div className="text-[11px] text-[var(--danger)] font-bold mt-1 text-center">
              Streak broken (missed day)
            </div>
          )}
        </div>
      ) : (
        /* Vertical Thermometer */
        <div className="relative flex flex-col items-center">
          <svg
            viewBox="0 0 100 320"
            className="w-24 h-72 block select-none"
            role="img"
            aria-label={`Thermometer showing ${checkedCount} of ${numDays} days completed.`}
          >
            {/* Thermometer Tube */}
            <rect
              x="38"
              y="20"
              width="24"
              height="240"
              rx="12"
              fill="var(--bg-elevated)"
              stroke="var(--border-default)"
              strokeWidth="2.5"
            />

            {/* Bottom Bulb */}
            <circle
              cx="50"
              cy="270"
              r="24"
              fill={isFailed ? "var(--danger)" : isSucceeded ? "var(--success)" : "var(--accent)"}
              stroke="var(--border-default)"
              strokeWidth="2.5"
            />

            {/* Rising Mercury Column */}
            {fraction > 0 && (
              <rect
                x="41"
                y={20 + (240 * (1 - fraction))}
                width="18"
                height={240 * fraction + 15}
                rx="8"
                fill={isFailed ? "var(--danger)" : isSucceeded ? "var(--success)" : "var(--accent)"}
              />
            )}

            {/* Glass Crack effect when Failed */}
            {isFailed && (
              <path
                d="M 42 120 L 52 135 L 48 150 L 58 170"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {/* Day Ticks on Tube */}
            {days.map((d, idx) => {
              const y = 250 - (220 / (numDays - 1 || 1)) * idx;
              return (
                <g key={d.dayIndex}>
                  <line
                    x1="64"
                    y1={y}
                    x2="72"
                    y2={y}
                    stroke={d.isDone ? "var(--text-primary)" : "var(--border-subtle)"}
                    strokeWidth="1.5"
                  />
                  {idx % Math.ceil(numDays / 6) === 0 && (
                    <text
                      x="76"
                      y={y + 3}
                      fontSize="9"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-nanum)"
                    >
                      D{idx + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="text-xs font-mono font-bold mt-2 text-center">
            {checkedCount} / {numDays} Days
          </div>
        </div>
      )}
    </div>
  );
}
