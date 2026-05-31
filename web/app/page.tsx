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

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted">{children}</p>;
}

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
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight">Ver<span className="text-gold">dikt</span></span>
            <span className="tag text-muted">Somnia Testnet</span>
          </div>
          <Connect />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 text-center">
          <Kicker>Trustless arbitration on Somnia</Kicker>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Trustless AI verdicts,<br /><span className="text-gold">settled on-chain.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted">Escrow, invoices, gifts and sealed envelopes — each its own contract. When a deal is disputed, Somnia's consensus-validated on-chain AI rules the outcome and settles funds automatically, with a real audit receipt. No admin, no jurors, no trusted middleman.</p>
          <div className="mt-7 flex justify-center gap-3">
            <a className="btn-gold" href="#create">Create a verdict</a>
            <a className="btn-ghost" href="#how">How it works</a>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <Kicker>What is Verdikt</Kicker>
          <h2 className="mt-2 max-w-3xl text-2xl font-bold md:text-3xl">On-chain escrow with an AI judge.</h2>
          <p className="mt-4 max-w-3xl text-muted">Verdikt locks funds for any agreement — a freelance deliverable, an invoice, a gift, or a sealed payment. The happy path is simple: the payer releases and the payee gets paid. But if the two sides disagree, the case is handed to Somnia's on-chain AI agents, which reach validator consensus on a binding verdict — <span className="text-white">Release</span>, <span className="text-white">Refund</span>, or <span className="text-white">Split</span> — and the contract settles automatically. There is no owner, no admin key, and no human juror who can be bribed or coerced.</p>
        </section>

        <section className="border-t border-line py-14">
          <Kicker>Why Somnia</Kicker>
          <h2 className="mt-2 max-w-3xl text-2xl font-bold md:text-3xl">The verdict itself is verified on-chain.</h2>
          <p className="mt-4 max-w-3xl text-muted">Most “AI + crypto” apps run the model off-chain and ask you to trust the output. Somnia is different — its Agents run a deterministic LLM across a validator subcommittee that reaches consensus on the result, so the ruling is verified by the network, not a single server.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Consensus, not trust", "A validator subcommittee agrees on the verdict — no single party can decide the outcome."],
              ["Auditable receipts", "Every ruling links to a genuine execution receipt: request, reasoning, response."],
              ["Fast & low-cost", "Sub-second finality and low fees make on-chain arbitration actually practical."],
            ].map(([t, d]) => (
              <div key={t} className="panel p-4">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-line py-14">
          <Kicker>How it works</Kicker>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["01 — Create & fund", "Open an escrow, invoice, gift or envelope — each is its own on-chain contract that locks your STT."],
              ["02 — Dispute → on-chain AI", "If the parties disagree, Somnia's validator subcommittee runs a deterministic LLM and reaches consensus."],
              ["03 — Auto-settle + receipt", "The contract releases, refunds or splits the funds automatically, linked to an auditable receipt."],
            ].map(([t, d]) => (
              <div key={t} className="panel p-5">
                <p className="font-mono text-sm text-gold">{t}</p>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-14">
          <Kicker>Verdict types</Kicker>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {TEMPLATES.map((t) => (
              <div key={t.id} className="panel p-5">
                <p className="font-semibold"><span className="mr-2 font-mono text-xs text-muted">{t.code}</span>{t.label}</p>
                <p className="mt-1 text-sm text-muted">{t.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="create" className="border-t border-line py-14">
          <Kicker>Create a verdict</Kicker>
          <div className="panel mt-4 p-6">
            <p className="mb-4 text-sm text-muted">Pick a type — each is a dedicated contract, all settled by Somnia's on-chain AI if disputed.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTplId(t.id)}
                  className={`tag ${tplId === t.id ? "border-gold text-gold" : "text-muted hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mb-4 text-sm text-muted">{tpl.blurb}</p>
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
          </div>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="mb-4 text-lg font-semibold">{tpl.label} cases <span className="text-muted">({n})</span></h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ids.map((id) => feat ? <FeatureCard key={id.toString()} id={id} type={tplId as Exclude<TemplateId, "escrow">} /> : <DealCard key={id.toString()} id={id} />)}
            {n === 0 && <p className="text-sm text-muted">No {tpl.label.toLowerCase()} cases yet. Create one above.</p>}
          </div>
        </section>

        <footer className="border-t border-line py-8 text-center text-xs text-muted">
          Powered by Somnia Agents (on-chain AI consensus) · Nous Hermes (advocate) · built for the Somnia Agentathon
        </footer>
      </main>
    </>
  );
}
