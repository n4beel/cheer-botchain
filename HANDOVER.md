# Handover: 60 — Cheer (`cheer-botchain`)

## 1. Overview & Verification

- **Status**: Completed and fully verified.
- **Verification Gates**:
  - `forge test`: 23 unit/fuzz tests + 1 stateful invariant test (256 runs, 128,000 calls, 0 reverts) pass.
  - `npm test`: 10 vitest suites (48 tests) pass.
  - `npm run test:integration`: 2 test suites (5 tests) pass against local Anvil (port 8660).
  - `npm run typecheck`: clean pass.
  - `npm run build`: optimized production Next.js build succeeds with all routes valid.
  - `python3 scripts/mutation-check.py cheer`: 22/25 mutants killed (3 benign/equivalent documented in `contracts/DECISIONS.md`).
  - `python3 scripts/check-distinct.py cheer`: clean pass (0 pair/file problems across 60 projects).
  - `python3 scripts/check-tokens.py cheer`: clean pass (0 undefined tokens).
  - `python3 scripts/check-ui-contract.py cheer`: clean pass.
  - `python3 scripts/check-honesty.py cheer`: clean pass (0 findings).

## 2. Palette & WCAG Compliance

- **Ground**: `#0A6F8C`
- **Ink**: `#F2FBFF`
- **Surface**: `#074B5F`
- **Accent**: `#FFC93C` (Accent-ink `#0A2A36`)
- **Contrast Ratios**:
  - Ink on ground: 5.46:1 (AA)
  - Ink on surface: 9.18:1 (AAA)
  - Muted on surface: 7.75:1 (AAA)
  - Accent-ink on accent: 9.78:1 (AAA)
  - Menu text on menu-bg: 9.18:1 (AAA)
  - Menu muted on menu-bg: 4.78:1 (AA)

## 3. Key Components & Routes

- `/`: Streaks list featuring compact horizontal thermometers and streak status.
- `/start`: Streak creation form with character counters and input parameter guards.
- `/goal/[id]`: Vertical SVG thermometer, crowd visualization of backers, athlete check-in button, back form, and settle / refund triggers.
- `/me`: User's streaks declared, backer claims, and earnings pull withdrawal.
- `components/thermometer/Thermometer.tsx`: SVG vertical and horizontal thermometer with crack graphics on failure and accessible table toggle.
- `components/thermometer/CrowdVisualization.tsx`: Proportional bubble layout of backer contributions.
