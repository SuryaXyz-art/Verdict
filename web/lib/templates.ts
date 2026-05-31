// Verdict Types: professional UX templates over the same audited escrow + on-chain AI primitive.
// Each tags the on-chain `terms` so cards can render the right label/actions — no contract change.
export type TemplateId = "escrow" | "invoice" | "gift" | "envelope";

export interface Template {
  id: TemplateId;
  label: string;
  icon: string;
  blurb: string;        // shown on the frontend as a brief description
  partyLabel: string;   // placeholder for the counterparty address
  placeholder: string;  // placeholder for the terms field
  confirmLabel: string; // label for the client's release action
}

export const TEMPLATES: Template[] = [
  {
    id: "escrow", label: "Escrow", icon: "🔒",
    blurb: "Lock funds for a deliverable. Release on completion, or let Somnia's on-chain AI arbitrate a dispute.",
    partyLabel: "Provider address (0x…)",
    placeholder: "Deliverable / terms (e.g. 'Logo delivered as SVG by Fri')",
    confirmLabel: "Confirm Delivery",
  },
  {
    id: "invoice", label: "Invoice", icon: "🧾",
    blurb: "Pay an itemized invoice into escrow. Accept to release the payment, or dispute and let the AI court rule.",
    partyLabel: "Payer address (0x…)",
    placeholder: "Invoice items & amount due (e.g. '40h design @ 0.01 STT/h — final logo set')",
    confirmLabel: "Accept & Pay Invoice",
  },
  {
    id: "gift", label: "Gift", icon: "🎁",
    blurb: "Reserve STT as a gift for someone. Release it whenever you're ready — disputes still settle on-chain.",
    partyLabel: "Recipient address (0x…)",
    placeholder: "Gift message (e.g. 'Happy birthday! 🎉')",
    confirmLabel: "Send Gift",
  },
  {
    id: "envelope", label: "Envelope", icon: "✉️",
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
