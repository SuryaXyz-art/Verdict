export const COURT_ADDRESS = (process.env.NEXT_PUBLIC_COURT_ADDRESS ?? "") as `0x${string}`;

export const STATE_LABELS = ["None", "Open", "Judging", "Resolved"] as const;
export const VERDICT_LABELS = ["—", "Release", "Refund", "Split"] as const;

export const courtAbi = [
  { type: "function", name: "dealCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "disputeDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reputation", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getDeal", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "client", type: "address" },
        { name: "provider", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "terms", type: "string" },
        { name: "clientEvidence", type: "string" },
        { name: "providerEvidence", type: "string" },
        { name: "state", type: "uint8" },
        { name: "requestId", type: "uint256" },
        { name: "verdict", type: "uint8" },
        { name: "judgedAt", type: "uint256" },
      ],
    }],
  },
  { type: "function", name: "JUDGMENT_TIMEOUT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "judgedAt", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "forceSettle", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "createDeal", stateMutability: "payable", inputs: [{ name: "provider", type: "address" }, { name: "terms", type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "submitEvidence", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "evidence", type: "string" }], outputs: [] },
  { type: "function", name: "confirmDelivery", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
] as const;
