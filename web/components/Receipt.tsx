"use client";
import { useState } from "react";
import { RECEIPTS_BASE, AGENTS_APP_BASE, AGENT_REQUESTER } from "@/lib/chain";

type Step = { name: string; [k: string]: unknown };

// Renders the genuine Somnia execution receipt (not a mock) for a verdict.
export function Receipt({ requestId }: { requestId: bigint }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${RECEIPTS_BASE}/agent-receipts?requestId=${requestId.toString()}&contractAddress=${AGENT_REQUESTER}&type=minimal`);
      if (!res.ok) throw new Error(`receipt ${res.status}`);
      const data = await res.json();
      const found: Step[] = data.receipts?.[0]?.agentReceipt?.steps ?? [];
      if (found.length === 0) throw new Error("no receipt steps published yet — use the full receipt link above");
      setSteps(found);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  if (requestId === 0n) return null;

  return (
    <div className="mt-3">
      <a className="btn-ghost text-xs" href={`${AGENTS_APP_BASE}/receipts/${requestId.toString()}`} target="_blank" rel="noreferrer">
        View full Somnia receipt ↗
      </a>
      {!steps && (
        <button className="btn-ghost ml-2 text-xs" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load inline"}
        </button>
      )}
      {err && <p className="mt-2 text-xs text-red-400">Receipt unavailable: {err}</p>}
      {steps && (
        <ol className="mt-2 space-y-1 rounded-lg border border-dashed border-line bg-black/50 p-3 font-mono text-xs">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-muted">{s.name}</span>
            </li>
          ))}
          <li className="pt-1 text-[10px] text-muted/60">request {requestId.toString()} · receipts.testnet.agents.somnia.host</li>
        </ol>
      )}
    </div>
  );
}
