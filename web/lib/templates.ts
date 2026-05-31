// Verdict Types: each maps to its own deployed contract (see lib/features.ts + VerdictCourt).
export type TemplateId = "escrow" | "invoice" | "gift" | "envelope";

export interface Template {
  id: TemplateId;
  label: string;
  code: string;         // short monospace marker shown in the UI
  blurb: string;
  partyLabel: string;
  placeholder: string;
  confirmLabel: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "escrow", label: "Escrow", code: "ESC",
    blurb: "Lock funds for a deliverable. Release on completion, or let Somnia's on-chain AI arbitrate a dispute.",
    partyLabel: "Provider address (0x…)",
    placeholder: "Deliverable / terms (e.g. 'Logo delivered as SVG by Fri')",
    confirmLabel: "Confirm Delivery",
  },
  {
    id: "invoice", label: "Invoice", code: "INV",
    blurb: "Pay an itemized invoice into escrow. Accept to release the payment, or dispute and let the AI court rule.",
    partyLabel: "Payer address (0x…)",
    placeholder: "Invoice items & amount due (e.g. '40h design @ 0.01 STT/h — final logo set')",
    confirmLabel: "Accept & Pay Invoice",
  },
  {
    id: "gift", label: "Gift", code: "GFT",
    blurb: "Reserve STT as a gift for someone. Release it whenever you're ready — disputes still settle on-chain.",
    partyLabel: "Recipient address (0x…)",
    placeholder: "Gift message (e.g. 'Congratulations on the launch')",
    confirmLabel: "Send Gift",
  },
  {
    id: "envelope", label: "Envelope", code: "ENV",
    blurb: "Send a payment wrapped with a private note. The recipient accepts to claim; otherwise AI arbitration applies.",
    partyLabel: "Recipient address (0x…)",
    placeholder: "Sealed note to include with the payment",
    confirmLabel: "Hand Over Envelope",
  },
];

export const templateById = (id: string): Template => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const tagTerms = (id: TemplateId, terms: string) => `[${id}] ${terms}`;

export function parseTerms(terms: string): { tpl: Template; text: string } {
  const m = terms.match(/^\[(escrow|invoice|gift|envelope)\]\s*([\s\S]*)$/);
  return m ? { tpl: templateById(m[1]), text: m[2] } : { tpl: TEMPLATES[0], text: terms };
}
