"use client";
import { useState } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { parseEther, isAddress } from "viem";
import { COURT_ADDRESS, courtAbi } from "@/lib/contract";
import { TEMPLATES, templateById, TemplateId } from "@/lib/templates";
import { isFeature, FEATURE_ADDR, invoiceAbi, buildCreate } from "@/lib/features";
import { Connect } from "@/components/Connect";
import { DealCard } from "@/components/DealCard";
import { FeatureCard } from "@/components/FeatureCard";

export default function Home() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [tplId, setTplId] = useState<TemplateId>("escrow");
  const [party, setParty] = useState("");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [passcode, setPasscode] = useState("");
  const tpl = templateById(tplId);

  const feat = isFeature(tplId);
  const activeAddr = feat ? FEATURE_ADDR[tplId] : COURT_ADDRESS;
  const activeConfigured = activeAddr.length === 42;

  const escrow = useReadContract({ address: COURT_ADDRESS, abi: courtAbi, functionName: "dealCount", query: { enabled: !feat && activeConfigured } });
  const feature = useReadContract({ address: activeAddr, abi: invoiceAbi, functionName: "count", query: { enabled: feat && activeConfigured } });
  const refetch = () => { escrow.refetch(); feature.refetch(); };

  const n = Number((feat ? feature.data : escrow.data) ?? 0n);
  const ids = Array.from({ length: n }, (_, i) => BigInt(n - i)); // newest first

  const valid = isAddress(party) && text.length > 0 && Number(amount) > 0 && (tplId !== "envelope" || passcode.length > 0);
  async function create() {
    const call = feat
      ? buildCreate(tplId, party as `0x${string}`, amount, text, passcode)
      : { address: COURT_ADDRESS, abi: courtAbi, functionName: "createDeal", args: [party as `0x${string}`, text], value: parseEther(amount) };
    await writeContractAsync(call as any);
    setParty(""); setText(""); setAmount(""); setPasscode("");
    setTimeout(refetch, 2500);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black">Ver<span className="text-gold">dikt</span></span>
          <span className="tag text-muted">Somnia Testnet</span>
        </div>
        <Connect />
      </header>

      <section className="py-14 text-center">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Trustless AI verdicts,<br /><span className="text-gold">settled on-chain.</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">Escrow, invoices, gifts and sealed envelopes — each its own contract. If a deal is disputed, Somnia's consensus-validated on-chain AI rules the outcome and settles funds automatically, with a real audit receipt. No admin, no jurors.</p>
      </section>

      <section className="mb-10 grid gap-3 md:grid-cols-3">
        {[
          ["1 · Create & fund", "Open an escrow, invoice, gift or envelope — each is its own on-chain contract that locks your STT."],
          ["2 · Dispute → on-chain AI", "If the parties disagree, Somnia's validator subcommittee runs a deterministic LLM and reaches consensus on the verdict."],
          ["3 · Auto-settle + receipt", "The contract releases, refunds or splits the funds automatically, linked to a genuine, auditable execution receipt."],
        ].map(([t, d]) => (
          <div key={t} className="panel p-4">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <h2 className="mb-1 text-lg font-semibold">Create a verdict</h2>
        <p className="mb-4 text-sm text-muted">Pick a type — each is a dedicated contract, all settled by Somnia's on-chain AI if disputed.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setTplId(t.id)}
              className={`tag ${tplId === t.id ? "border-gold text-gold" : "text-muted hover:text-white"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-sm text-muted">{tpl.icon} {tpl.blurb}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder={tpl.partyLabel} value={party} onChange={(e) => setParty(e.target.value)} />
          <input className="input" placeholder="Amount in STT" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="input md:col-span-2" placeholder={tpl.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
          {tplId === "envelope" && (
            <input className="input md:col-span-2" placeholder="Passcode (share with the recipient to open)" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
          )}
        </div>
        <button className="btn-gold mt-4" disabled={!valid || isPending || !activeConfigured} onClick={create}>
          {isPending ? "Confirm in wallet…" : `Create ${tpl.label}`}
        </button>
        {!activeConfigured && <p className="mt-3 text-sm text-neutral-300">Set <span className="font-mono">{feat ? `NEXT_PUBLIC_${tplId.toUpperCase()}_ADDRESS` : "NEXT_PUBLIC_COURT_ADDRESS"}</span> in <span className="font-mono">.env.local</span> to enable this type.</p>}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Verdict types</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="panel p-4">
              <p className="font-semibold">{t.icon} {t.label}</p>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{tpl.icon} {tpl.label} cases <span className="text-muted">({n})</span></h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ids.map((id) => feat ? <FeatureCard key={id.toString()} id={id} type={tplId as Exclude<TemplateId, "escrow">} /> : <DealCard key={id.toString()} id={id} />)}
          {n === 0 && <p className="text-sm text-muted">No {tpl.label.toLowerCase()} cases yet. Create one above.</p>}
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-center text-xs text-muted">
        Powered by Somnia Agents (on-chain AI consensus) · Nous Hermes (advocate) · built for the Somnia Agentathon
      </footer>
    </main>
  );
}
