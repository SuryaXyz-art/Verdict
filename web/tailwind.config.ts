import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",
        panel: "rgba(255,255,255,0.04)",
        line: "rgba(255,255,255,0.08)",
        gold: "#f2ca50",
        muted: "#9aa0a6",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
