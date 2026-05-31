// Off-chain "Advocate": Nous Hermes drafts human-readable case analysis.
// This is advisory only — the binding verdict comes from Somnia's on-chain AI.
const BASE = process.env.NOUS_BASE_URL!;
const KEY = process.env.NOUS_API_KEY!;
const MODEL = process.env.NOUS_MODEL ?? "Hermes-4-405B";

export async function advocateBrief(terms: string, clientEv: string, providerEv: string): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a neutral case analyst. Summarize the dispute and give the strongest good-faith argument for each side in under 150 words. Do NOT declare a winner — the on-chain AI court decides that." },
        { role: "user", content: `TERMS: ${terms}\nCLIENT: ${clientEv || "(none)"}\nPROVIDER: ${providerEv || "(none)"}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Nous ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
