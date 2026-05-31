import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        panel: "rgba(255,255,255,0.04)",
        line: "rgba(255,255,255,0.12)",
        gold: "#ffffff",
        muted: "#a1a1aa",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
