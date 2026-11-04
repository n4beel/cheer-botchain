// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Cheer.sol";

contract MaliciousRecipient {
  Cheer public cheer;
  uint256 public goalId;
  bool public attackWithdraw;

  constructor(Cheer _cheer) {
    cheer = _cheer;
  }

  function setGoalId(uint256 id) external {
    goalId = id;
  }

  function setAttackWithdraw(bool v) external {
    attackWithdraw = v;
  }

  receive() external payable {
    if (attackWithdraw) {
      cheer.withdraw();
    } else if (goalId > 0) {
      cheer.refund(goalId);
    }
  }
}

contract CheerTest is Test {
  Cheer public cheer;

  address public athlete = address(0x1111);
  address public backerA = address(0x2222);
  address public backerB = address(0x3333);
  address public outsider = address(0x4444);

  function setUp() public {
    cheer = new Cheer();
    vm.deal(athlete, 100 ether);
    vm.deal(backerA, 100 ether);
    vm.deal(backerB, 100 ether);
    vm.deal(outsider, 100 ether);

    // Set a predictable block timestamp (e.g. 1000 days into UNIX epoch)
    vm.warp(1000 days + 12 hours);
  }

  function test_StartSetsStartDayAheadOfToday() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Run 5k every morning at dawn", 10, 2);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(g.athlete, athlete);
    assertEq(g.startDay, today + 2);
    assertEq(g.numDays, 10);
    assertEq(uint8(g.state), uint8(Cheer.State.Backing));
    assertEq(g.title, "Run 5k");
    assertEq(g.backers, 0);
    assertEq(g.pledged, 0);
  }

  function test_BadTextDaysLeadRevert() public {
    vm.startPrank(athlete);

    // Empty title
    vm.expectRevert(Cheer.BadText.selector);
    cheer.start("", "Goal text", 10, 2);

    // Overlong title (65 bytes)
    string memory longTitle = new string(65);
    vm.expectRevert(Cheer.BadText.selector);
    cheer.start(longTitle, "Goal text", 10, 2);

    // Empty goal
    vm.expectRevert(Cheer.BadText.selector);
    cheer.start("Title", "", 10, 2);

    // Overlong goal (201 bytes)
    string memory longGoal = new string(201);
    vm.expectRevert(Cheer.BadText.selector);
    cheer.start("Title", longGoal, 10, 2);

    // Bad days: < 3 or > 60
    vm.expectRevert(Cheer.BadDays.selector);
    cheer.start("Title", "Goal", 2, 2);

    vm.expectRevert(Cheer.BadDays.selector);
    cheer.start("Title", "Goal", 61, 2);

    // Bad lead: < 1 or > 14
    vm.expectRevert(Cheer.BadLead.selector);
    cheer.start("Title", "Goal", 10, 0);

    vm.expectRevert(Cheer.BadLead.selector);
    cheer.start("Title", "Goal", 10, 15);

    vm.stopPrank();
  }

  function test_BackLocksPledge_AccumulatesPerBacker() public {
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 2);

    vm.prank(backerA);
    cheer.back{value: 1 ether}(id);

    Cheer.Goal memory g1 = cheer.goalOf(id);
    assertEq(g1.backers, 1);
    assertEq(g1.pledged, 1 ether);
    assertEq(cheer.pledgeOf(id, backerA), 1 ether);

    // Backer A backs again (accumulates, does not bump backer count)
    vm.prank(backerA);
    cheer.back{value: 0.5 ether}(id);

    Cheer.Goal memory g2 = cheer.goalOf(id);
    assertEq(g2.backers, 1);
    assertEq(g2.pledged, 1.5 ether);
    assertEq(cheer.pledgeOf(id, backerA), 1.5 ether);

    // Backer B backs
    vm.prank(backerB);
    cheer.back{value: 2 ether}(id);

    Cheer.Goal memory g3 = cheer.goalOf(id);
    assertEq(g3.backers, 2);
    assertEq(g3.pledged, 3.5 ether);
  }

  function test_AthleteCannotBack() public {
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 2);

    vm.prank(athlete);
    vm.expectRevert(Cheer.AthleteCannotBack.selector);
    cheer.back{value: 1 ether}(id);
  }

  function test_BackAfterStartReverts_ArgsStartDay() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 2);

    // Warp to startDay
    vm.warp((today + 2) * 1 days + 1 hours);

    vm.prank(backerA);
    vm.expectRevert(abi.encodeWithSelector(Cheer.BackingClosed.selector, today + 2));
    cheer.back{value: 1 ether}(id);
  }

  function test_PledgeTooSmall_ArgsMin() public {
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 2);

    vm.prank(backerA);
    vm.expectRevert(abi.encodeWithSelector(Cheer.PledgeTooSmall.selector, 0.01 ether));
    cheer.back{value: 0.005 ether}(id);
  }

  function test_CheckInSetsTodaysBit() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 1);

    // Warp to day 0 of streak
    vm.warp((today + 1) * 1 days + 5 hours);

    vm.prank(athlete);
    cheer.checkIn(id);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(g.doneBits, 1); // bit 0 set
    assertEq(cheer.daysDone(id), 1);

    // Warp to day 1 of streak
    vm.warp((today + 2) * 1 days + 6 hours);
    vm.prank(athlete);
    cheer.checkIn(id);

    g = cheer.goalOf(id);
    assertEq(g.doneBits, 3); // bits 0 and 1 set (1 | 2 = 3)
    assertEq(cheer.daysDone(id), 2);
  }

  function test_CheckInTwiceReverts_ArgsDay() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 7, 1);

    vm.warp((today + 1) * 1 days + 5 hours);
    vm.prank(athlete);
    cheer.checkIn(id);

    // Check in again same day
    vm.prank(athlete);
    vm.expectRevert(abi.encodeWithSelector(Cheer.AlreadyCheckedIn.selector, uint16(0)));
    cheer.checkIn(id);
  }

  function test_CheckInOutsideRunReverts() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 5, 2);

    // Before startDay
    vm.prank(athlete);
    vm.expectRevert(abi.encodeWithSelector(Cheer.NotRunning.selector, today + 2, uint16(5)));
    cheer.checkIn(id);

    // After streak ends (day 5+, i.e. today + 2 + 5 = today + 7)
    vm.warp((today + 7) * 1 days + 1 hours);
    vm.prank(athlete);
    vm.expectRevert(abi.encodeWithSelector(Cheer.NotRunning.selector, today + 2, uint16(5)));
    cheer.checkIn(id);
  }

  function test_OnlyAthleteChecksIn() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Run 5k", "Goal text", 5, 1);

    vm.warp((today + 1) * 1 days + 2 hours);
    vm.prank(outsider);
    vm.expectRevert(Cheer.NotAthlete.selector);
    cheer.checkIn(id);
  }

  function test_SettleSuccessPaysAthleteAllPledges() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Read 30m", "Goal text", 3, 1);

    vm.prank(backerA);
    cheer.back{value: 2 ether}(id);
    vm.prank(backerB);
    cheer.back{value: 3 ether}(id);

    // Check in day 0, 1, 2
    for (uint64 k = 0; k < 3; k++) {
      vm.warp((today + 1 + k) * 1 days + 8 hours);
      vm.prank(athlete);
      cheer.checkIn(id);
    }

    // Warp to after day 2 (day 3)
    vm.warp((today + 4) * 1 days + 1 hours);

    // Settle can be called by anyone
    vm.prank(outsider);
    cheer.settle(id);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(uint8(g.state), uint8(Cheer.State.Succeeded));
    assertEq(cheer.pending(athlete), 5 ether);

    // Athlete withdraws
    uint256 preBal = athlete.balance;
    vm.prank(athlete);
    cheer.withdraw();
    assertEq(athlete.balance, preBal + 5 ether);
    assertEq(cheer.pending(athlete), 0);
  }

  function test_SettleFailsOnFirstMiss_EvenBeforeEnd() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Meditate", "Goal text", 10, 1);

    vm.prank(backerA);
    cheer.back{value: 4 ether}(id);

    // Check in day 0
    vm.warp((today + 1) * 1 days + 8 hours);
    vm.prank(athlete);
    cheer.checkIn(id);

    // Athlete misses day 1! Day 1 passes. Now on day 2.
    vm.warp((today + 3) * 1 days + 8 hours);

    // Even though streak is for 10 days, day 1 was missed, so settle immediately fails it
    vm.prank(outsider);
    cheer.settle(id);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(uint8(g.state), uint8(Cheer.State.Failed));
    assertEq(cheer.pending(athlete), 0);
  }

  function test_SettleTooEarlyReverts() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Meditate", "Goal text", 5, 2);

    // Before startDay
    vm.prank(outsider);
    vm.expectRevert(Cheer.NothingToSettle.selector);
    cheer.settle(id);

    // Day 0 of streak: checked in, day not yet over
    vm.warp((today + 2) * 1 days + 2 hours);
    vm.prank(athlete);
    cheer.checkIn(id);

    vm.prank(outsider);
    vm.expectRevert(Cheer.NothingToSettle.selector);
    cheer.settle(id);
  }

  function test_RefundAfterFailureReturnsExactPledge() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Gym", "Goal text", 4, 1);

    vm.prank(backerA);
    cheer.back{value: 3 ether}(id);

    vm.prank(backerB);
    cheer.back{value: 1.5 ether}(id);

    // Miss day 0: warp to day 1
    vm.warp((today + 2) * 1 days + 2 hours);
    cheer.settle(id);

    // Backer A refunds
    uint256 preA = backerA.balance;
    vm.prank(backerA);
    cheer.refund(id);
    assertEq(backerA.balance, preA + 3 ether);
    assertTrue(cheer.isRefunded(id, backerA));

    // Backer B refunds
    uint256 preB = backerB.balance;
    vm.prank(backerB);
    cheer.refund(id);
    assertEq(backerB.balance, preB + 1.5 ether);
    assertTrue(cheer.isRefunded(id, backerB));
  }

  function test_RefundOnce() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Gym", "Goal text", 4, 1);

    vm.prank(backerA);
    cheer.back{value: 1 ether}(id);

    vm.warp((today + 2) * 1 days + 2 hours);
    cheer.settle(id);

    vm.prank(backerA);
    cheer.refund(id);

    // Second refund reverts
    vm.prank(backerA);
    vm.expectRevert(Cheer.NothingToRefund.selector);
    cheer.refund(id);
  }

  function test_NoBackersSuccessCreditsZero() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Solo habit", "Goal text", 3, 1);

    for (uint64 k = 0; k < 3; k++) {
      vm.warp((today + 1 + k) * 1 days + 8 hours);
      vm.prank(athlete);
      cheer.checkIn(id);
    }

    vm.warp((today + 4) * 1 days + 1 hours);
    cheer.settle(id);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(uint8(g.state), uint8(Cheer.State.Succeeded));
    assertEq(cheer.pending(athlete), 0);
  }

  function test_NoCheckInAtAllFailsAfterDayOne() public {
    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Solo habit", "Goal text", 3, 1);

    // Day 0 ends, now day 1 (today + 2)
    vm.warp((today + 2) * 1 days + 1 hours);
    cheer.settle(id);

    Cheer.Goal memory g = cheer.goalOf(id);
    assertEq(uint8(g.state), uint8(Cheer.State.Failed));
  }

  function test_ReentrantRefundBlocked() public {
    MaliciousRecipient mal = new MaliciousRecipient(cheer);
    vm.deal(address(mal), 10 ether);

    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("Gym", "Goal text", 3, 1);
    mal.setGoalId(id);

    vm.prank(address(mal));
    cheer.back{value: 2 ether}(id);

    // Miss day 0
    vm.warp((today + 2) * 1 days + 2 hours);
    cheer.settle(id);

    // Attacking refund should revert
    vm.prank(address(mal));
    vm.expectRevert(Cheer.TransferFailed.selector);
    cheer.refund(id);
  }

  function test_ReentrantWithdrawBlocked() public {
    MaliciousRecipient mal = new MaliciousRecipient(cheer);
    vm.deal(address(mal), 10 ether);

    uint64 today = uint64(block.timestamp / 1 days);
    // mal is athlete
    vm.prank(address(mal));
    uint256 id = cheer.start("Gym", "Goal text", 3, 1);
    mal.setAttackWithdraw(true);

    vm.prank(backerA);
    cheer.back{value: 2 ether}(id);

    for (uint64 k = 0; k < 3; k++) {
      vm.warp((today + 1 + k) * 1 days + 8 hours);
      vm.prank(address(mal));
      cheer.checkIn(id);
    }

    vm.warp((today + 4) * 1 days + 1 hours);
    cheer.settle(id);

    // Attacking withdraw should revert
    vm.prank(address(mal));
    vm.expectRevert(Cheer.TransferFailed.selector);
    cheer.withdraw();
  }

  function testFuzz_OutcomeMatchesReference(uint8 numDaysIn, uint64 doneBitsPattern) public {
    uint16 numDays = uint16(bound(numDaysIn, 3, 60));

    uint64 today = uint64(block.timestamp / 1 days);
    vm.prank(athlete);
    uint256 id = cheer.start("FuzzGoal", "Goal text", numDays, 1);

    // Back goal
    vm.prank(backerA);
    cheer.back{value: 1 ether}(id);

    // Simulate check-in pattern
    bool hasMiss = false;
    uint16 firstMiss = 0;

    for (uint16 k = 0; k < numDays; k++) {
      bool shouldCheckIn = ((doneBitsPattern >> k) & 1) != 0;
      if (shouldCheckIn) {
        vm.warp((today + 1 + k) * 1 days + 10 hours);
        vm.prank(athlete);
        cheer.checkIn(id);
      } else if (!hasMiss) {
        hasMiss = true;
        firstMiss = k;
      }
    }

    // Warp past the entire streak
    vm.warp((today + 1 + numDays + 1) * 1 days + 1 hours);

    cheer.settle(id);
    Cheer.Goal memory g = cheer.goalOf(id);

    if (hasMiss) {
      assertEq(uint8(g.state), uint8(Cheer.State.Failed));
      assertEq(cheer.pending(athlete), 0);
    } else {
      assertEq(uint8(g.state), uint8(Cheer.State.Succeeded));
      assertEq(cheer.pending(athlete), 1 ether);
    }
  }

  function testFuzz_Conservation(uint8 numBackersIn, bool allCheckIns) public {
    uint8 numBackers = uint8(bound(numBackersIn, 1, 10));
    uint64 today = uint64(block.timestamp / 1 days);

    vm.prank(athlete);
    uint256 id = cheer.start("ConserveGoal", "Goal text", 3, 1);

    uint256 totalPledged = 0;
    for (uint8 i = 0; i < numBackers; i++) {
      address b = address(uint160(0x8000 + i));
      vm.deal(b, 10 ether);
      uint128 amt = uint128((i + 1) * 0.1 ether);
      vm.prank(b);
      cheer.back{value: amt}(id);
      totalPledged += amt;
    }

    assertEq(address(cheer).balance, totalPledged);

    if (allCheckIns) {
      for (uint64 k = 0; k < 3; k++) {
        vm.warp((today + 1 + k) * 1 days + 5 hours);
        vm.prank(athlete);
        cheer.checkIn(id);
      }
      vm.warp((today + 4) * 1 days + 1 hours);
      cheer.settle(id);
      assertEq(cheer.pending(athlete), totalPledged);
      vm.prank(athlete);
      cheer.withdraw();
      assertEq(address(cheer).balance, 0);
    } else {
      // Miss day 0
      vm.warp((today + 2) * 1 days + 1 hours);
      cheer.settle(id);
      for (uint8 i = 0; i < numBackers; i++) {
        address b = address(uint160(0x8000 + i));
        vm.prank(b);
        cheer.refund(id);
      }
      assertEq(address(cheer).balance, 0);
    }
  }

  function test_SpecificMutantKillers() public {
    // 1. Text length boundaries: exactly 64 bytes title, exactly 200 bytes goal
    string memory exact64 = "1234567890123456789012345678901234567890123456789012345678901234";
    assertEq(bytes(exact64).length, 64);
    bytes memory exact200Bytes = new bytes(200);
    for (uint256 i = 0; i < 200; i++) exact200Bytes[i] = "a";

    vm.prank(athlete);
    uint256 idBoundary = cheer.start(exact64, string(exact200Bytes), 3, 1);
    assertEq(cheer.goalOf(idBoundary).title, exact64);

    // 2. Status view coverage
    (uint64 curToday, uint64 startDay, int32 dayNumber, bool canSettle) = cheer.status(idBoundary);
    assertTrue(startDay > curToday);
    assertEq(dayNumber, -1);
    assertFalse(canSettle);

    // 3. byAthlete view coverage
    (uint256[] memory athleteIds, , uint256 totalAthlete) = cheer.byAthlete(athlete, 0, 10);
    assertEq(athleteIds.length, 1);
    assertEq(totalAthlete, 1);

    // 4. latest view clamping coverage
    (uint256[] memory latestIds, , uint256 totalLatest) = cheer.latest(0, 10);
    assertEq(latestIds.length, 1);
    assertEq(totalLatest, 1);
  }

  function test_AdditionalMutantKillers() public {
    // 5. Kill mutant at line 112: MAX_LEAD_DAYS boundary (14 days)
    vm.prank(athlete);
    uint256 id14 = cheer.start("Lead 14", "Goal 14", 5, 14);
    assertEq(cheer.goalOf(id14).numDays, 5);

    // 6. Kill mutant at line 303 & line 324: status() running dayNumber and canSettle on completed streak
    vm.prank(athlete);
    uint256 id3 = cheer.start("Habit 3d", "Goal 3d", 3, 1);
    uint64 sDay = cheer.goalOf(id3).startDay;

    vm.warp(sDay * 1 days + 12 hours);
    (, , int32 dayNumDuring, ) = cheer.status(id3);
    assertEq(dayNumDuring, 1); // today - startDay + 1 = 1

    // Check in on day 0, 1, 2 for id3
    for (uint64 k = 0; k < 3; k++) {
      vm.warp((sDay + k) * 1 days + 10 hours);
      vm.prank(athlete);
      cheer.checkIn(id3);
    }
    // Warp to after day 2 (day 3)
    vm.warp((sDay + 3) * 1 days + 2 hours);
    (, , , bool canSettleCompleted) = cheer.status(id3);
    assertTrue(canSettleCompleted); // kills canSettle = false mutant on line 324!

    // 7. Kill mutant at line 398: latest(offset, count) when total > 1 and offset > 0
    // id14 is id 1, id3 is id 2. total = 2.
    // latest(1, 1): offset = 1, count = 1. id = total - (offset + i) = 2 - (1 + 0) = 1.
    (uint256[] memory sliceIds, , ) = cheer.latest(1, 1);
    assertEq(sliceIds.length, 1);
    assertEq(sliceIds[0], 1);
  }
}
