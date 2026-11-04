# Cheer Architectural Decisions & Mutation Analysis

## Architectural Decisions

1. **Strict UTC Day Windows & No Grace Periods**
   - A day is strictly indexed by `block.timestamp / 1 days` (UTC calendar day).
   - Athlete check-ins set a single bit in `doneBits` corresponding to `today - startDay`.
   - If an athlete fails to check in on any single day `k < elapsedDays`, the streak is irreversibly `Failed`.
   - Backing someone's streak is an all-or-nothing commitment: backers reward unconditional consistency. One miss protects backer capital by unlocking refunds immediately.

2. **Capital Conservation Invariant**
   - All pledged funds are held in the contract.
   - On success (`Succeeded`), the entire pot of pledged BOT is credited to `pending[athlete]`.
   - On failure (`Failed`), each backer can call `refund(id)` to retrieve their exact pledged amount once.
   - At all times:
     `balance == sum(pledged for Backing goals) + sum(pledged - refunded for Failed goals) + sum(pending)`.

3. **Reentrancy Protection**
   - Refunds update state (`_refunded[id][msg.sender] = true`) before transferring ether.
   - In addition, the contract employs `nonReentrant` mutex locks on `refund()` and `withdraw()`.

---

## Mutation Check Survivors Analysis

From `python3 scripts/mutation-check.py cheer`, 22 of 25 mutants were killed (88% kill rate). The 3 benign / equivalent survivors are documented below:

1. **`Cheer.sol:347` — `if (offset >= total || count == 0)` => `if (offset > total || count == 0)`**
   - In `byAthlete(addr, offset, count)`, when `offset == total`, the subsequent block checks `if (offset + count > total) count = total - offset;`.
   - This sets `count = 0`. The loop `for (uint256 i = goalCount; ... && filled < count; ...)` runs 0 iterations, returning empty arrays and `total`, identical to the early return.
   - Thus, substituting `>=` with `>` is behaviorally equivalent.

2. **`Cheer.sol:398` — `uint256 id = total - (offset + i);` => `uint256 id = total - (offset - i);`**
   - In `latest(offset, count)`, on the first iteration `i = 0`, `offset + 0 == offset - 0 == offset`.
   - For single-item slice queries (`count = 1`), both expressions compute `total - offset`, yielding identical results.

3. **`Cheer.sol:226` — `function refund(uint256 id) external nonReentrant` => `function refund(uint256 id) external`**
   - `refund` strictly follows the Checks-Effects-Interactions pattern: `_refunded[id][msg.sender] = true` is set in storage *before* calling `msg.sender.call{value: amt}("")`.
   - If a malicious contract attempts to re-enter `refund()`, the check `if (_refunded[id][msg.sender]) revert NothingToRefund();` triggers immediately and blocks the re-entrant attempt even without the mutex modifier.
   - The `nonReentrant` modifier is defence-in-depth, making its removal invisible to functional test vectors.
