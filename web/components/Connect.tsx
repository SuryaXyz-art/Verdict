"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { somniaTestnet } from "@/lib/chain";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function Connect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected)
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-gold" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>
        {error && <span className="max-w-xs text-right text-xs text-red-400">{error.message}</span>}
      </div>
    );

  if (chainId !== somniaTestnet.id)
    return <button className="btn-ghost" onClick={() => switchChain({ chainId: somniaTestnet.id })}>Switch to Somnia</button>;

  return (
    <button className="btn-ghost font-mono" onClick={() => disconnect()} title="Disconnect">
      {short(address)}
    </button>
  );
}
