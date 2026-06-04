import { keccak256, toHex, parseEther } from "viem";
import type { TemplateId } from "./templates";

const A = (k?: string) => (k ?? "") as `0x${string}`;
type FeatureId = Exclude<TemplateId, "escrow">;

export const FEATURE_ADDR: Record<FeatureId, `0x${string}`> = {
  invoice: A(process.env.NEXT_PUBLIC_INVOICE_ADDRESS),
  gift: A(process.env.NEXT_PUBLIC_GIFT_ADDRESS),
  envelope: A(process.env.NEXT_PUBLIC_ENVELOPE_ADDRESS),
};

// Common shape exposed to the UI: a, b, amount, text, state, requestId, verdict, judgedAt (for forceSettle escape hatch).
export const invoiceAbi = [
  { type: "function", name: "count", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "disputeDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "JUDGMENT_TIMEOUT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "judgedAt", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "forceSettle", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "getInvoice", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "tuple", components: [
    { name: "a", type: "address" }, { name: "b", type: "address" }, { name: "amount", type: "uint256" },
    { name: "text", type: "string" }, { name: "note", type: "string" },
    { name: "state", type: "uint8" }, { name: "requestId", type: "uint256" }, { name: "verdict", type: "uint8" }, { name: "judgedAt", type: "uint256" }] }] },
  { type: "function", name: "createInvoice", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }, { type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "payInvoice", stateMutability: "payable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "accept", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "payable", inputs: [{ type: "uint256" }, { type: "string" }], outputs: [] },
] as const;

export const giftAbi = [
  { type: "function", name: "count", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "disputeDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "JUDGMENT_TIMEOUT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "judgedAt", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "forceSettle", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "getGift", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "tuple", components: [
    { name: "a", type: "address" }, { name: "b", type: "address" }, { name: "amount", type: "uint256" },
    { name: "text", type: "string" }, { name: "note", type: "string" },
    { name: "state", type: "uint8" }, { name: "requestId", type: "uint256" }, { name: "verdict", type: "uint8" }, { name: "judgedAt", type: "uint256" }] }] },
  { type: "function", name: "sendGift", stateMutability: "payable", inputs: [{ type: "address" }, { type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "payable", inputs: [{ type: "uint256" }, { type: "string" }], outputs: [] },
] as const;

export const envelopeAbi = [
  { type: "function", name: "count", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "disputeDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "JUDGMENT_TIMEOUT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "judgedAt", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "forceSettle", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "getEnvelope", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "tuple", components: [
    { name: "a", type: "address" }, { name: "b", type: "address" }, { name: "amount", type: "uint256" },
    { name: "lock", type: "bytes32" }, { name: "text", type: "string" },
    { name: "state", type: "uint8" }, { name: "requestId", type: "uint256" }, { name: "verdict", type: "uint8" }, { name: "judgedAt", type: "uint256" }] }] },
  { type: "function", name: "seal", stateMutability: "payable", inputs: [{ type: "address" }, { type: "bytes32" }, { type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "open", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "string" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "payable", inputs: [{ type: "uint256" }, { type: "string" }], outputs: [] },
] as const;

export const FEATURE = {
  invoice: { abi: invoiceAbi, getter: "getInvoice", aLabel: "payer", bLabel: "payee", claimLabel: "Accept & Pay Invoice" },
  gift: { abi: giftAbi, getter: "getGift", aLabel: "sender", bLabel: "recipient", claimLabel: "Claim Gift" },
  envelope: { abi: envelopeAbi, getter: "getEnvelope", aLabel: "sender", bLabel: "recipient", claimLabel: "Open Envelope" },
} as const;

export const isFeature = (id: TemplateId): id is FeatureId => id !== "escrow";

// Build the create write-call for a feature type from the form inputs.
export function buildCreate(id: FeatureId, party: `0x${string}`, amount: string, text: string, passcode: string) {
  const value = parseEther(amount || "0");
  if (id === "invoice") return { address: FEATURE_ADDR.invoice, abi: invoiceAbi, functionName: "createInvoice", args: [party, value, text] };
  if (id === "gift") return { address: FEATURE_ADDR.gift, abi: giftAbi, functionName: "sendGift", args: [party, text], value };
  return { address: FEATURE_ADDR.envelope, abi: envelopeAbi, functionName: "seal", args: [party, keccak256(toHex(passcode)), text], value };
}
