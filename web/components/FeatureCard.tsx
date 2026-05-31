"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { VERDICT_LABELS } from "@/lib/contract";
import { FEATURE, FEATURE_ADDR } from "@/lib/features";
import type { TemplateId } from "@/lib/templates";
import { templateById } from "@/lib/templates";
import { Receipt } from "./Receipt";

type FeatureId = Exclude<TemplateId, "escrow">;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function FeatureCard({ id, type }: { id: bigint; type: FeatureId }) {
  const cfg = FEATURE[type];
  const addr = FEATURE_ADDR[type];
  const tpl = templateById(type);
  const { address } = useAccount();
  const { data: deal, refetch } = useReadContract({ address: addr, abi: cfg.abi, functionName: cfg.getter, args: [id] } as any);
  const { data: deposit } = useReadContract({ address: addr, abi: cfg.abi, functionName: "disputeDeposit" });
  const { writeContractAsync, isPending } = useWriteContract();
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");

  if (!deal) return null;
  const d = deal as any;
  const me = address?.toLowerCase();
  const isA = me === d.a.toLowerCase();   // payer / sender
  const isB = me === d.b.toLowerCase();   // payee / recipient
  const isParty = isA || isB;
  const unfunded = type === "invoice" && d.state === 0;
  const open = d.state === 1, judging = d.state === 2, resolved = d.state === 3;
  const stateText = unfunded ? "Awaiting payment" : judging ? "Judging" : resolved ? "Resolved" : "Active";

  const tx = (functionName: string, args: readonly unknown[], value?: bigint) =>
    writeContractAsync({ address: addr, abi: cfg.abi, functionName, args, value } as any).then(() => setTimeout(refetch, 2500));

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted">Case #{id.toString()} <span className="text-white">{tpl.icon} {tpl.label}</span></span>
        <span className={`tag ${open ? "text-white" : judging ? "text-neutral-400" : "text-neutral-200"}`}>{stateText}</span>
      </div>
      <p className="mt-3 text-sm">{d.text}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>{cfg.aLabel} {short(d.a)}</span>
        <span>{cfg.bLabel} {short(d.b)}</span>
        <span className="text-white">{formatEther(d.amount)} STT</span>
      </div>

      {resolved && (
        <div className="mt-4 border-t border-line pt-3">
          <span className="text-sm">Verdict: <span className="font-semibold text-white">{VERDICT_LABELS[d.verdict]}</span></span>
          <Receipt requestId={d.requestId} />
        </div>
      )}

      {judging && <p className="mt-4 text-xs text-neutral-400">⚖️ Somnia AI committee is deliberating… (request {d.requestId.toString()})</p>}

      {unfunded && isA && (
        <button className="btn-gold mt-4 text-xs" disabled={isPending} onClick={() => tx("payInvoice", [id], d.amount)}>
          Pay Invoice ({formatEther(d.amount)} STT)
        </button>
      )}

      {open && isParty && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          {type === "envelope" && isB && (
            <input className="input" placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} />
          )}
          <textarea className="input h-16" placeholder="Reason / note for the AI (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {type === "invoice" && isA && <button className="btn-ghost text-xs" disabled={isPending} onClick={() => tx("accept", [id])}>{cfg.claimLabel}</button>}
            {type === "gift" && isB && <button className="btn-ghost text-xs" disabled={isPending} onClick={() => tx("claim", [id])}>{cfg.claimLabel}</button>}
            {type === "envelope" && isB && <button className="btn-ghost text-xs" disabled={isPending || !code} onClick={() => tx("open", [id, code])}>{cfg.claimLabel}</button>}
            <button className="btn-gold text-xs" disabled={isPending || !deposit} onClick={() => tx("dispute", [id, note], deposit as bigint)}>
              Resolve with AI{deposit ? ` (${formatEther(deposit as bigint)} STT)` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
