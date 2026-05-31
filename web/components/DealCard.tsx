"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { COURT_ADDRESS, courtAbi, STATE_LABELS, VERDICT_LABELS } from "@/lib/contract";
import { Receipt } from "./Receipt";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function DealCard({ id }: { id: bigint }) {
  const { address } = useAccount();
  const { data: deal, refetch } = useReadContract({ address: COURT_ADDRESS, abi: courtAbi, functionName: "getDeal", args: [id] });
  const { data: deposit } = useReadContract({ address: COURT_ADDRESS, abi: courtAbi, functionName: "disputeDeposit" });
  const { data: providerRep } = useReadContract({
    address: COURT_ADDRESS, abi: courtAbi, functionName: "reputation",
    args: [deal?.provider ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!deal },
  });
  const { writeContractAsync, isPending } = useWriteContract();
  const [evidence, setEvidence] = useState("");

  if (!deal) return null;
  const me = address?.toLowerCase();
  const isClient = me === deal.client.toLowerCase();
  const isProvider = me === deal.provider.toLowerCase();
  const isParty = isClient || isProvider;
  const open = deal.state === 1, judging = deal.state === 2, resolved = deal.state === 3;

  const tx = (fn: string, args: readonly unknown[], value?: bigint) =>
    writeContractAsync({ address: COURT_ADDRESS, abi: courtAbi, functionName: fn, args, value } as any).then(() => setTimeout(refetch, 2500));

  const stateColor = open ? "text-gold" : judging ? "text-blue-400" : "text-green-400";

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted">Case #{id.toString()}</span>
        <span className={`tag ${stateColor}`}>{STATE_LABELS[deal.state]}</span>
      </div>
      <p className="mt-3 text-sm">{deal.terms}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>client {short(deal.client)}</span>
        <span>provider {short(deal.provider)}</span>
        <span className="tag text-gold" title="Wins ruled by the AI court">★ {(providerRep ?? 0n).toString()}</span>
        <span className="text-white">{formatEther(deal.amount)} STT</span>
      </div>

      {resolved && (
        <div className="mt-4 border-t border-line pt-3">
          <span className="text-sm">Verdict: <span className="font-semibold text-gold">{VERDICT_LABELS[deal.verdict]}</span></span>
          <Receipt requestId={deal.requestId} />
        </div>
      )}

      {judging && <p className="mt-4 text-xs text-blue-400">⚖️ Somnia AI committee is deliberating… (request {deal.requestId.toString()})</p>}

      {open && isParty && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <textarea className="input h-16" placeholder="Submit your evidence…" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost text-xs" disabled={isPending || !evidence} onClick={() => tx("submitEvidence", [id, evidence])}>Submit Evidence</button>
            {isClient && <button className="btn-ghost text-xs" disabled={isPending} onClick={() => tx("confirmDelivery", [id])}>Confirm Delivery</button>}
            <button className="btn-gold text-xs" disabled={isPending || !deposit} onClick={() => tx("dispute", [id], deposit as bigint)}>
              Resolve with AI{deposit ? ` (${formatEther(deposit as bigint)} STT)` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
