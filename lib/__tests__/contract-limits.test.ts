import { describe, it, expect } from "vitest";
import {
  MIN_DAYS,
  MAX_DAYS,
  MIN_LEAD_DAYS,
  MAX_LEAD_DAYS,
  MIN_PLEDGE,
  MAX_TITLE_BYTES,
  MAX_GOAL_BYTES,
} from "../cheer";
import { BOTCHAIN_ABI } from "../botchain/abi";

describe("Cheer contract limits parity", () => {
  it("matches constant limits in ABI", () => {
    const minDaysAbi = BOTCHAIN_ABI.find((x: any) => x.name === "MIN_DAYS");
    expect(minDaysAbi).toBeDefined();

    const maxDaysAbi = BOTCHAIN_ABI.find((x: any) => x.name === "MAX_DAYS");
    expect(maxDaysAbi).toBeDefined();

    const minLeadAbi = BOTCHAIN_ABI.find((x: any) => x.name === "MIN_LEAD_DAYS");
    expect(minLeadAbi).toBeDefined();

    const maxLeadAbi = BOTCHAIN_ABI.find((x: any) => x.name === "MAX_LEAD_DAYS");
    expect(maxLeadAbi).toBeDefined();

    const minPledgeAbi = BOTCHAIN_ABI.find((x: any) => x.name === "MIN_PLEDGE");
    expect(minPledgeAbi).toBeDefined();

    expect(MIN_DAYS).toBe(3);
    expect(MAX_DAYS).toBe(60);
    expect(MIN_LEAD_DAYS).toBe(1);
    expect(MAX_LEAD_DAYS).toBe(14);
    expect(MIN_PLEDGE).toBe(10_000_000_000_000_000n);
    expect(MAX_TITLE_BYTES).toBe(64);
    expect(MAX_GOAL_BYTES).toBe(200);
  });
});
