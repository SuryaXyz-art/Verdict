export const verdictAbi = [
  {
    type: "function", name: "getDeal", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      type: "tuple", name: "", components: [
        { name: "client", type: "address" },
        { name: "provider", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "terms", type: "string" },
        { name: "clientEvidence", type: "string" },
        { name: "providerEvidence", type: "string" },
        { name: "state", type: "uint8" },
        { name: "requestId", type: "uint256" },
        { name: "verdict", type: "uint8" },
      ],
    }],
  },
  {
    type: "event", name: "Disputed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event", name: "Resolved",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "verdict", type: "uint8", indexed: false },
      { name: "requestId", type: "uint256", indexed: true },
    ],
  },
] as const;

export const VERDICT_LABELS = ["None", "Release", "Refund", "Split"] as const;
