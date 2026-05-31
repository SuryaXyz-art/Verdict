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
    // One button: prefer the injected wallet (MetaMask), fall back to any discovered connector.
    const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <button className="btn-gold" disabled={isPending} title={error?.message}
        onClick={() => connector && connect({ connector })}>
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
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
