import { formatEther } from "viem";

export const MIN_DAYS = 3;
export const MAX_DAYS = 60;
export const MIN_LEAD_DAYS = 1;
export const MAX_LEAD_DAYS = 14;
export const MIN_PLEDGE = 10_000_000_000_000_000n; // 0.01 ether
export const MAX_TITLE_BYTES = 64;
export const MAX_GOAL_BYTES = 200;
export const MAX_PAGE = 50;

export enum GoalState {
  Backing = 0,
  Succeeded = 1,
  Failed = 2,
}

export interface Goal {
  athlete: `0x${string}`;
  startDay: bigint;
  numDays: number;
  state: GoalState;
  goalBlock: number;
  backers: number;
  pledged: bigint;
  doneBits: bigint;
  title: string;
}

export interface GoalData extends Goal {
  id: bigint;
}

export interface BackerInfo {
  address: `0x${string}`;
  pledge: bigint;
}

/**
 * Returns UTC day index for a given unix timestamp in seconds
 */
export function dayIndex(timestampSec: number | bigint): bigint {
  return BigInt(timestampSec) / 86400n;
}

/**
 * Returns relative day number during or before a streak:
 * negative if before startDay (-1, -2...), positive if running (1, 2, ...)
 */
export function dayNumber(startDay: bigint, nowDay: bigint): number {
  if (nowDay < startDay) {
    return -Number(startDay - nowDay);
  }
  return Number(nowDay - startDay + 1n);
}

/**
 * Mirrors contract settle logic to determine outcome:
 * returns { state, canSettle, firstMissDay }
 */
export function outcome(
  doneBits: bigint,
  numDays: number,
  nowDay: bigint,
  startDay: bigint
): {
  state: GoalState;
  canSettle: boolean;
  firstMissDay: number;
} {
  let n = 0;
  if (nowDay > startDay) {
    const elapsed = Number(nowDay - startDay);
    n = elapsed > numDays ? numDays : elapsed;
  }

  for (let k = 0; k < n; k++) {
    const mask = 1n << BigInt(k);
    if ((doneBits & mask) === 0n) {
      return {
        state: GoalState.Failed,
        canSettle: true,
        firstMissDay: k,
      };
    }
  }

  if (n === numDays) {
    return {
      state: GoalState.Succeeded,
      canSettle: true,
      firstMissDay: 0,
    };
  }

  return {
    state: GoalState.Backing,
    canSettle: false,
    firstMissDay: 0,
  };
}

/**
 * Computes fraction of thermometer filled (0.0 to 1.0)
 */
export function mercuryFraction(doneCount: number, numDays: number): number {
  if (numDays <= 0) return 0;
  return Math.min(1, Math.max(0, doneCount / numDays));
}

/**
 * Formats crowd backer bubbles sized by pledge
 */
export function crowd(
  pledges: { who: `0x${string}`; amount: bigint }[]
): { who: `0x${string}`; radius: number; amount: bigint }[] {
  if (!pledges.length) return [];
  const maxPledge = pledges.reduce(
    (max, p) => (p.amount > max ? p.amount : max),
    1n
  );

  return pledges.map((p) => {
    // Radius between 4 and 16 based on pledge ratio
    const ratio = Number((p.amount * 100n) / maxPledge) / 100;
    const radius = 4 + ratio * 12;
    return {
      who: p.who,
      radius,
      amount: p.amount,
    };
  });
}
