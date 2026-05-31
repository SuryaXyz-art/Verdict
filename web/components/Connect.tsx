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
    const onClick = () => {
      if (typeof window !== "undefined" && !(window as any).okxwallet) {
        window.open("https://www.okx.com/web3", "_blank");
        return;
      }
      if (connectors[0]) connect({ connector: connectors[0] });
    };
    return (
      <button className="btn-gold" disabled={isPending} title={error?.message} onClick={onClick}>
        {isPending ? "Connecting…" : "Connect OKX Wallet"}
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
