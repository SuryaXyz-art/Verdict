"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { somniaTestnet } from "@/lib/chain";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function Connect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const seen = new Set<string>();
    const wallets = connectors.filter((c) => !seen.has(c.name) && seen.add(c.name));
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          {wallets.length ? (
            wallets.map((c) => (
              <button key={c.uid} className="btn-gold" disabled={isPending} onClick={() => connect({ connector: c })}>
                {isPending ? "Connecting…" : `Connect ${c.name}`}
              </button>
            ))
          ) : (
            <a className="btn-gold" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Install a Wallet</a>
          )}
        </div>
        {error && <span className="max-w-xs text-right text-xs text-neutral-400">{error.message}</span>}
      </div>
    );
  }

  if (chainId !== somniaTestnet.id)
    return <button className="btn-ghost" onClick={() => switchChain({ chainId: somniaTestnet.id })}>Switch to Somnia</button>;

  return (
    <button className="btn-ghost font-mono" onClick={() => disconnect()} title="Disconnect">
      {short(address)}
    </button>
  );
}
