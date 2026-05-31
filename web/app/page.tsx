"use client";
import { useState } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { parseEther, isAddress } from "viem";
import { COURT_ADDRESS, courtAbi } from "@/lib/contract";
import { Connect } from "@/components/Connect";
import { DealCard } from "@/components/DealCard";

export default function Home() {
  const configured = COURT_ADDRESS.length === 42;
  const { data: count, refetch } = useReadContract({ address: COURT_ADDRESS, abi: courtAbi, functionName: "dealCount", query: { enabled: configured } });
  const { writeContractAsync, isPending } = useWriteContract();
  const [provider, setProvider] = useState("");
  const [terms, setTerms] = useState("");
  const [amount, setAmount] = useState("");

  const n = count ? Number(count) : 0;
  const ids = Array.from({ length: n }, (_, i) => BigInt(n - i)); // newest first

  const valid = isAddress(provider) && terms.length > 0 && Number(amount) > 0;
  async function create() {
    await writeContractAsync({
      address: COURT_ADDRESS, abi: courtAbi, functionName: "createDeal",
      args: [provider as `0x${string}`, terms], value: parseEther(amount),
    });
    setProvider(""); setTerms(""); setAmount("");
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
        <p className="mx-auto mt-4 max-w-xl text-muted">Escrow any deal. If it's disputed, Somnia's consensus-validated on-chain AI rules the outcome and settles funds automatically — with a real audit receipt. No admin, no jurors.</p>
      </section>

      {!configured && (
        <div className="panel mb-8 p-4 text-sm text-yellow-300">
          Set <span className="font-mono">NEXT_PUBLIC_COURT_ADDRESS</span> in <span className="font-mono">.env.local</span> after deploying (Phase 3).
        </div>
      )}

      <section className="panel p-6">
        <h2 className="mb-4 text-lg font-semibold">Create an escrow deal</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Provider address (0x…)" value={provider} onChange={(e) => setProvider(e.target.value)} />
          <input className="input" placeholder="Amount in STT" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="input md:col-span-2" placeholder="Deliverable / terms (e.g. 'Logo delivered as SVG by Fri')" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>
        <button className="btn-gold mt-4" disabled={!valid || isPending || !configured} onClick={create}>
          {isPending ? "Confirm in wallet…" : "Create & Escrow"}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Cases <span className="text-muted">({n})</span></h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ids.map((id) => <DealCard key={id.toString()} id={id} />)}
          {n === 0 && <p className="text-sm text-muted">No cases yet. Create the first escrow above.</p>}
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-center text-xs text-muted">
        Powered by Somnia Agents (on-chain AI consensus) · Nous Hermes (advocate) · built for the Somnia Agentathon
      </footer>
    </main>
  );
}
