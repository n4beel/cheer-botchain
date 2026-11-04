import { describe, it, expect } from "vitest";
import {
  dayIndex,
  dayNumber,
  outcome,
  mercuryFraction,
  crowd,
  GoalState,
} from "../cheer";

describe("Cheer lib utilities", () => {
  it("calculates dayIndex correctly", () => {
    // 86400 seconds in a day
    expect(dayIndex(0)).toBe(0n);
    expect(dayIndex(86399)).toBe(0n);
    expect(dayIndex(86400)).toBe(1n);
    expect(dayIndex(172800)).toBe(2n);
  });

  it("calculates dayNumber relative to startDay", () => {
    const startDay = 100n;
    // Before start
    expect(dayNumber(startDay, 98n)).toBe(-2);
    expect(dayNumber(startDay, 99n)).toBe(-1);
    // During / after start
    expect(dayNumber(startDay, 100n)).toBe(1);
    expect(dayNumber(startDay, 101n)).toBe(2);
    expect(dayNumber(startDay, 105n)).toBe(6);
  });

  it("calculates outcome for completed streak (all bits set)", () => {
    const startDay = 100n;
    const numDays = 5;
    // 5 bits set: 1 + 2 + 4 + 8 + 16 = 31n
    const doneBits = 31n;
    const nowDay = 105n; // 5 days completed

    const res = outcome(doneBits, numDays, nowDay, startDay);
    expect(res.state).toBe(GoalState.Succeeded);
    expect(res.canSettle).toBe(true);
  });

  it("calculates outcome for streak with early missed day", () => {
    const startDay = 100n;
    const numDays = 5;
    // Checked in day 0, missed day 1: doneBits = 1n
    const doneBits = 1n;
    const nowDay = 102n; // Day 0 and 1 have passed (now on day 2)

    const res = outcome(doneBits, numDays, nowDay, startDay);
    expect(res.state).toBe(GoalState.Failed);
    expect(res.canSettle).toBe(true);
    expect(res.firstMissDay).toBe(1);
  });

  it("calculates outcome while streak is active with no misses so far", () => {
    const startDay = 100n;
    const numDays = 5;
    // Checked in day 0 and day 1: doneBits = 3n
    const doneBits = 3n;
    const nowDay = 102n; // Day 0 and 1 elapsed, now on day 2 (not yet elapsed)

    const res = outcome(doneBits, numDays, nowDay, startDay);
    expect(res.state).toBe(GoalState.Backing);
    expect(res.canSettle).toBe(false);
  });

  it("computes mercuryFraction correctly", () => {
    expect(mercuryFraction(0, 10)).toBe(0);
    expect(mercuryFraction(5, 10)).toBe(0.5);
    expect(mercuryFraction(10, 10)).toBe(1);
  });

  it("sizes crowd bubbles proportionally", () => {
    const pledges = [
      { who: "0x1" as `0x${string}`, amount: 1000n },
      { who: "0x2" as `0x${string}`, amount: 500n },
    ];
    const bubbles = crowd(pledges);
    expect(bubbles.length).toBe(2);
    expect(bubbles[0].radius).toBe(16); // max pledge gets max radius 16
    expect(bubbles[1].radius).toBe(10); // half ratio gets radius 10
  });
});
