// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Cheer
 * @notice Back someone's daily streak. They're paid only if they keep it.
 */
contract Cheer {
  enum State {
    Backing,
    Succeeded,
    Failed
  }

  struct Goal {
    address athlete;
    uint64 startDay;
    uint16 numDays;
    State state;
    uint32 goalBlock;
    uint32 backers;
    uint128 pledged;
    uint64 doneBits; // bit k set = checked in on day startDay + k (numDays <= 60)
    string title;
  }

  uint16 public constant MIN_DAYS = 3;
  uint16 public constant MAX_DAYS = 60;
  uint8 public constant MIN_LEAD_DAYS = 1;
  uint8 public constant MAX_LEAD_DAYS = 14;
  uint128 public constant MIN_PLEDGE = 0.01 ether;
  uint256 public constant MAX_TITLE_BYTES = 64;
  uint256 public constant MAX_GOAL_BYTES = 200;
  uint256 public constant MAX_PAGE = 50;

  mapping(uint256 => Goal) private _goals;
  mapping(uint256 => mapping(address => uint128)) private _pledge;
  mapping(uint256 => mapping(address => bool)) private _refunded;
  mapping(address => uint256) public pending;
  uint256 public goalCount; // ids start at 1

  bool private _locked;

  // Custom errors
  error BadText();
  error BadDays();
  error BadLead();
  error GoalNotFound();
  error BackingClosed(uint64 startDay);
  error AthleteCannotBack();
  error PledgeTooSmall(uint128 min);
  error NotAthlete();
  error NotRunning(uint64 startDay, uint16 numDays);
  error AlreadyCheckedIn(uint16 dayIndex);
  error NothingToSettle();
  error NothingToRefund();
  error NothingToWithdraw();
  error TransferFailed();
  error ReentrantCall();

  // Events
  event Started(
    uint256 indexed id,
    address indexed athlete,
    string title,
    string goal,
    uint16 numDays,
    uint64 startDay
  );
  event Backed(
    uint256 indexed id,
    address indexed who,
    uint128 amount,
    uint128 pledged
  );
  event CheckedIn(uint256 indexed id, uint16 dayIndex);
  event Settled(uint256 indexed id, bool succeeded, uint16 firstMissDay);
  event Refunded(uint256 indexed id, address indexed who, uint128 amount);
  event Withdrawn(address indexed to, uint256 amount);

  modifier nonReentrant() {
    if (_locked) revert ReentrantCall();
    _locked = true;
    _;
    _locked = false;
  }

  /**
   * @notice Start a new streak goal
   */
  function start(
    string calldata title,
    string calldata goal,
    uint16 numDays,
    uint8 leadDays
  ) external returns (uint256 id) {
    bytes memory titleBytes = bytes(title);
    bytes memory goalBytes = bytes(goal);
    if (
      titleBytes.length == 0 ||
      titleBytes.length > MAX_TITLE_BYTES ||
      goalBytes.length == 0 ||
      goalBytes.length > MAX_GOAL_BYTES
    ) {
      revert BadText();
    }

    if (numDays < MIN_DAYS || numDays > MAX_DAYS) {
      revert BadDays();
    }

    if (leadDays < MIN_LEAD_DAYS || leadDays > MAX_LEAD_DAYS) {
      revert BadLead();
    }

    uint64 today = uint64(block.timestamp / 1 days);
    uint64 startDay = today + uint64(leadDays);

    id = ++goalCount;
    Goal storage g = _goals[id];
    g.athlete = msg.sender;
    g.startDay = startDay;
    g.numDays = numDays;
    g.state = State.Backing;
    g.goalBlock = uint32(block.number);
    g.title = title;

    emit Started(id, msg.sender, title, goal, numDays, startDay);
  }

  /**
   * @notice Pledge funds in support of a streak goal before it starts
   */
  function back(uint256 id) external payable {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    Goal storage g = _goals[id];

    if (g.state != State.Backing) revert BackingClosed(g.startDay);
    uint64 today = uint64(block.timestamp / 1 days);
    if (today >= g.startDay) revert BackingClosed(g.startDay);

    if (msg.sender == g.athlete) revert AthleteCannotBack();
    if (msg.value < MIN_PLEDGE) revert PledgeTooSmall(MIN_PLEDGE);

    if (_pledge[id][msg.sender] == 0) {
      g.backers += 1;
    }

    uint128 amt = uint128(msg.value);
    _pledge[id][msg.sender] += amt;
    g.pledged += amt;

    emit Backed(id, msg.sender, amt, g.pledged);
  }

  /**
   * @notice Check in for today's UTC day
   */
  function checkIn(uint256 id) external {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    Goal storage g = _goals[id];

    if (msg.sender != g.athlete) revert NotAthlete();
    if (g.state != State.Backing) revert NotRunning(g.startDay, g.numDays);

    uint64 today = uint64(block.timestamp / 1 days);
    if (today < g.startDay || today >= g.startDay + uint64(g.numDays)) {
      revert NotRunning(g.startDay, g.numDays);
    }

    uint16 dayIndex = uint16(today - g.startDay);
    uint64 mask = uint64(1) << dayIndex;
    if ((g.doneBits & mask) != 0) {
      revert AlreadyCheckedIn(dayIndex);
    }

    g.doneBits |= mask;
    emit CheckedIn(id, dayIndex);
  }

  /**
   * @notice Settle a streak once completed or upon first missed day
   */
  function settle(uint256 id) external {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    Goal storage g = _goals[id];

    if (g.state != State.Backing) revert NothingToSettle();

    uint64 today = uint64(block.timestamp / 1 days);
    // n = days that are fully in the past or current evaluated boundary
    // n = min(numDays, max(0, today - startDay))
    uint16 n = 0;
    if (today > g.startDay) {
      uint64 elapsed = today - g.startDay;
      if (elapsed > uint64(g.numDays)) {
        n = g.numDays;
      } else {
        n = uint16(elapsed);
      }
    }

    // Check if any fully completed day k < n has its bit == 0
    for (uint16 k = 0; k < n; k++) {
      if ((g.doneBits & (uint64(1) << k)) == 0) {
        g.state = State.Failed;
        emit Settled(id, false, k);
        return;
      }
    }

    // If no missed day found up to n, but n == numDays, then all days checked in!
    if (n == g.numDays) {
      g.state = State.Succeeded;
      pending[g.athlete] += g.pledged;
      emit Settled(id, true, 0);
      return;
    }

    revert NothingToSettle();
  }

  /**
   * @notice Claim back pledged funds after a streak fails
   */
  function refund(uint256 id) external nonReentrant {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    Goal storage g = _goals[id];

    if (g.state != State.Failed) revert NothingToRefund();
    uint128 amt = _pledge[id][msg.sender];
    if (amt == 0 || _refunded[id][msg.sender]) revert NothingToRefund();

    _refunded[id][msg.sender] = true;

    emit Refunded(id, msg.sender, amt);

    (bool ok, ) = msg.sender.call{value: amt}("");
    if (!ok) revert TransferFailed();
  }

  /**
   * @notice Athlete withdraws accrued winnings
   */
  function withdraw() external nonReentrant {
    uint256 amt = pending[msg.sender];
    if (amt == 0) revert NothingToWithdraw();

    pending[msg.sender] = 0;
    emit Withdrawn(msg.sender, amt);

    (bool ok, ) = msg.sender.call{value: amt}("");
    if (!ok) revert TransferFailed();
  }

  // Views

  function goalOf(uint256 id) external view returns (Goal memory) {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    return _goals[id];
  }

  function pledgeOf(uint256 id, address who) external view returns (uint128) {
    return _pledge[id][who];
  }

  function isRefunded(uint256 id, address who) external view returns (bool) {
    return _refunded[id][who];
  }

  function daysDone(uint256 id) external view returns (uint64) {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    uint64 bits = _goals[id].doneBits;
    uint64 count = 0;
    while (bits > 0) {
      count += bits & 1;
      bits >>= 1;
    }
    return count;
  }

  function status(
    uint256 id
  )
    external
    view
    returns (
      uint64 today,
      uint64 startDay,
      int32 dayNumber,
      bool canSettle
    )
  {
    if (id == 0 || id > goalCount) revert GoalNotFound();
    Goal storage g = _goals[id];

    today = uint64(block.timestamp / 1 days);
    startDay = g.startDay;

    if (today < startDay) {
      dayNumber = -int32(uint32(startDay - today));
    } else {
      dayNumber = int32(uint32(today - startDay + 1));
    }

    canSettle = false;
    if (g.state == State.Backing) {
      uint16 n = 0;
      if (today > g.startDay) {
        uint64 elapsed = today - g.startDay;
        if (elapsed > uint64(g.numDays)) {
          n = g.numDays;
        } else {
          n = uint16(elapsed);
        }
      }
      for (uint16 k = 0; k < n; k++) {
        if ((g.doneBits & (uint64(1) << k)) == 0) {
          canSettle = true;
          break;
        }
      }
      if (!canSettle && n == g.numDays) {
        canSettle = true;
      }
    }
  }

  function byAthlete(
    address addr,
    uint256 offset,
    uint256 count
  )
    external
    view
    returns (uint256[] memory ids, Goal[] memory goals, uint256 total)
  {
    // First count matches
    uint256 matchCount = 0;
    for (uint256 i = 1; i <= goalCount; i++) {
      if (_goals[i].athlete == addr) {
        matchCount++;
      }
    }
    total = matchCount;

    if (offset >= total || count == 0) {
      return (new uint256[](0), new Goal[](0), total);
    }
    if (count > MAX_PAGE) {
      count = MAX_PAGE;
    }
    if (offset + count > total) {
      count = total - offset;
    }

    ids = new uint256[](count);
    goals = new Goal[](count);

    uint256 seen = 0;
    uint256 filled = 0;
    // Walk newest first
    for (uint256 i = goalCount; i >= 1 && filled < count; i--) {
      if (_goals[i].athlete == addr) {
        if (seen >= offset) {
          ids[filled] = i;
          goals[filled] = _goals[i];
          filled++;
        }
        seen++;
      }
    }
  }

  function latest(
    uint256 offset,
    uint256 count
  )
    external
    view
    returns (uint256[] memory ids, Goal[] memory goals, uint256 total)
  {
    total = goalCount;
    if (offset >= total || count == 0) {
      return (new uint256[](0), new Goal[](0), total);
    }
    if (count > MAX_PAGE) {
      count = MAX_PAGE;
    }
    if (offset + count > total) {
      count = total - offset;
    }

    ids = new uint256[](count);
    goals = new Goal[](count);

    for (uint256 i = 0; i < count; i++) {
      uint256 id = total - (offset + i);
      ids[i] = id;
      goals[i] = _goals[id];
    }
  }
}
