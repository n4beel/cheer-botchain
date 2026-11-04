# Cheer (`cheer-botchain`)

**Back someone's streak. They're paid only if they keep it.**

Cheer is a conditional habit patronage application built on BOT Chain. An athlete declares a streak goal with a duration (3–60 days) and a lead time (1–14 days). Backers pledge BOT before the start date. During the streak, the athlete must check in on every UTC day. If they complete every single day, all pledged funds are awarded to the athlete. If they miss even a single day, the streak fails and all backers can refund their exact pledges.

---

## Technical Snapshot

- **Archetype**: AY · Thermometer
- **Palette**: `#0A6F8C` ground, `#F2FBFF` ink, `#FFC93C` accent
- **Fonts**: Abril Fatface (display) · Raleway (UI) · Nanum Gothic Coding (mono/dates)
- **Ports**: Integration test `8660`, local stack `8760`
- **Contract**: `contracts/src/Cheer.sol`
  - Invariant: `balance == sum(pledged of Backing) + sum(unrefunded of Failed) + sum(pending)`
  - Bitwise check-ins (`doneBits` uint64) for gas-efficient daily tracking.

---

## Contrast & Accessibility (WCAG 2.1)

- **Ink on ground (`#F2FBFF` on `#0A6F8C`)**: 5.46:1 (AA)
- **Ink on surface (`#F2FBFF` on `#074B5F`)**: 9.18:1 (AAA)
- **Muted on surface (`#D6EAF1` on `#074B5F`)**: 7.75:1 (AAA)
- **Accent-ink on accent (`#0A2A36` on `#FFC93C`)**: 9.78:1 (AAA)
- **Menu text on menu background (`#F2FBFF` on `#074B5F`)**: 9.18:1 (AAA)
- **Menu muted on menu background (`#9DBCC5` on `#074B5F`)**: 4.78:1 (AA)

All visual thermometer elements feature accessible table fallbacks, and the check-in and action buttons are fully keyboard navigable.

---

## Verification & Testing

- `forge test`: 23 unit & fuzz tests + 1 stateful invariant suite (256 runs, 128,000 calls, 0 reverts).
- `vitest run lib test/lint`: 10 suites passing (48 unit tests).
- `npm run test:integration`: 2 test suites (5 tests) passing against local Anvil (port 8660).
- `python3 scripts/mutation-check.py cheer`: 22/25 mutants killed (3 benign/equivalent documented in `contracts/DECISIONS.md`).
- `python3 scripts/check-distinct.py cheer`: clean pass.
- `python3 scripts/check-tokens.py cheer`: clean pass.
- `python3 scripts/check-ui-contract.py cheer`: clean pass.
- `python3 scripts/check-honesty.py cheer`: clean pass.
- `npm run build`: Production Next.js build succeeds with zero errors.
