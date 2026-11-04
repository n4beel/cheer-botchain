// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Cheer.sol";

contract CheerHandler is Test {
  Cheer public cheer;
  address[] public backers;
  address public athlete = address(0xAAAA);
  uint256 public activeGoalId;

  uint256 public totalPledgedExpected;
  uint256 public totalRefundedExpected;
  uint256 public totalAwardedExpected;

  constructor(Cheer _cheer) {
    cheer = _cheer;
    backers.push(address(0xB001));
    backers.push(address(0xB002));
    backers.push(address(0xB003));

    for (uint256 i = 0; i < backers.length; i++) {
      vm.deal(backers[i], 1000 ether);
    }
    vm.deal(athlete, 1000 ether);

    // Start with day 1000
    vm.warp(1000 days + 12 hours);

    // Start goal 1
    vm.prank(athlete);
    activeGoalId = cheer.start("InvariantGoal", "Daily check-in", 10, 2);
  }

  function backGoal(uint8 backerIdx, uint128 amount) external {
    address b = backers[backerIdx % backers.length];
    uint128 amt = uint128(bound(amount, 0.01 ether, 5 ether));

    Cheer.Goal memory g = cheer.goalOf(activeGoalId);
    uint64 today = uint64(block.timestamp / 1 days);
    if (g.state == Cheer.State.Backing && today < g.startDay) {
      vm.prank(b);
      cheer.back{value: amt}(activeGoalId);
      totalPledgedExpected += amt;
    }
  }

  function checkInDay() external {
    Cheer.Goal memory g = cheer.goalOf(activeGoalId);
    uint64 today = uint64(block.timestamp / 1 days);
    if (
      g.state == Cheer.State.Backing &&
      today >= g.startDay &&
      today < g.startDay + uint64(g.numDays)
    ) {
      uint16 dayIdx = uint16(today - g.startDay);
      if ((g.doneBits & (uint64(1) << dayIdx)) == 0) {
        vm.prank(athlete);
        cheer.checkIn(activeGoalId);
      }
    }
  }

  function advanceTime(uint32 hoursToAdvance) external {
    uint32 h = uint32(bound(hoursToAdvance, 1, 36));
    vm.warp(block.timestamp + h * 1 hours);
  }

  function settleGoal() external {
    Cheer.Goal memory g = cheer.goalOf(activeGoalId);
    if (g.state == Cheer.State.Backing) {
      try cheer.settle(activeGoalId) {} catch {}
    }
  }

  function refundGoal(uint8 backerIdx) external {
    address b = backers[backerIdx % backers.length];
    Cheer.Goal memory g = cheer.goalOf(activeGoalId);
    if (g.state == Cheer.State.Failed && cheer.pledgeOf(activeGoalId, b) > 0 && !cheer.isRefunded(activeGoalId, b)) {
      vm.prank(b);
      cheer.refund(activeGoalId);
    }
  }

  function withdrawPending() external {
    if (cheer.pending(athlete) > 0) {
      vm.prank(athlete);
      cheer.withdraw();
    }
  }
}

contract CheerInvariantTest is Test {
  Cheer public cheer;
  CheerHandler public handler;

  function setUp() public {
    cheer = new Cheer();
    handler = new CheerHandler(cheer);

    targetContract(address(handler));
  }

  function invariant_BalanceEqualsHeldPlusPending() public view {
    // Invariant: balance == Σ pledged of Backing goals + Σ (pledged - refunded) of Failed goals + Σ pending
    uint256 count = cheer.goalCount();
    uint256 expectedBalance = 0;

    for (uint256 id = 1; id <= count; id++) {
      Cheer.Goal memory g = cheer.goalOf(id);
      if (g.state == Cheer.State.Backing) {
        expectedBalance += g.pledged;
      } else if (g.state == Cheer.State.Failed) {
        // Check backers array from handler
        for (uint256 i = 0; i < 3; i++) {
          address b = handler.backers(i);
          if (!cheer.isRefunded(id, b)) {
            expectedBalance += cheer.pledgeOf(id, b);
          }
        }
      }
    }

    expectedBalance += cheer.pending(handler.athlete());

    assertEq(address(cheer).balance, expectedBalance);
  }
}
