export const BOTCHAIN_ABI = [
  {
    "type": "function",
    "name": "MAX_DAYS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_GOAL_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_LEAD_DAYS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PAGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TITLE_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_DAYS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_LEAD_DAYS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_PLEDGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "back",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "byAthlete",
    "inputs": [
      {
        "name": "addr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "goals",
        "type": "tuple[]",
        "internalType": "struct Cheer.Goal[]",
        "components": [
          {
            "name": "athlete",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startDay",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "numDays",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Cheer.State"
          },
          {
            "name": "goalBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "backers",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "pledged",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "doneBits",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          }
        ]
      },
      {
        "name": "total",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkIn",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "daysDone",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "goalCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "goalOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Cheer.Goal",
        "components": [
          {
            "name": "athlete",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startDay",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "numDays",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Cheer.State"
          },
          {
            "name": "goalBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "backers",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "pledged",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "doneBits",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isRefunded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "latest",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "goals",
        "type": "tuple[]",
        "internalType": "struct Cheer.Goal[]",
        "components": [
          {
            "name": "athlete",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startDay",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "numDays",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Cheer.State"
          },
          {
            "name": "goalBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "backers",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "pledged",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "doneBits",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          }
        ]
      },
      {
        "name": "total",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pending",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pledgeOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "start",
    "inputs": [
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "numDays",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "leadDays",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "status",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "today",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "startDay",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "dayNumber",
        "type": "int32",
        "internalType": "int32"
      },
      {
        "name": "canSettle",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Backed",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "pledged",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CheckedIn",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "dayIndex",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "succeeded",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "firstMissDay",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Started",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "athlete",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "title",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "numDays",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "startDay",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyCheckedIn",
    "inputs": [
      {
        "name": "dayIndex",
        "type": "uint16",
        "internalType": "uint16"
      }
    ]
  },
  {
    "type": "error",
    "name": "AthleteCannotBack",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BackingClosed",
    "inputs": [
      {
        "name": "startDay",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadDays",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLead",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadText",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GoalNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAthlete",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRunning",
    "inputs": [
      {
        "name": "startDay",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "numDays",
        "type": "uint16",
        "internalType": "uint16"
      }
    ]
  },
  {
    "type": "error",
    "name": "NothingToRefund",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToSettle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PledgeTooSmall",
    "inputs": [
      {
        "name": "min",
        "type": "uint128",
        "internalType": "uint128"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  }
] as const;
