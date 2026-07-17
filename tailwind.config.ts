import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deeper, richer ink — moves away from "SaaS navy" toward true
        // near-black with a cool undertone, like engraved letterhead.
        ink: {
          DEFAULT: "#0F1420",
          light: "#1A2036",
          soft: "#5B6272",
          faint: "#8B92A3",
        },
        // Warm parchment replaces cool grey — this is the single biggest
        // shift: it's what makes the app feel like fine stationery instead
        // of generic SaaS. Cards sit on it in true white for contrast.
        paper: {
          DEFAULT: "#F5F0E6",
          raised: "#FFFFFF",
          deep: "#EDE5D4",
        },
        // Gold used sparingly now — foil-stamp accent, not a UI workhorse.
        gold: {
          DEFAULT: "#B8863E",
          deep: "#8C6425",
          soft: "#EDE0C8",
        },
        // Deeper forest, less "success-green SaaS," more "bank vault."
        verified: {
          DEFAULT: "#16594A",
          soft: "#DCE9E3",
        },
        alert: {
          DEFAULT: "#A83E3E",
          soft: "#F0DEDC",
        },
        // NEW — reserved exclusively for the verification/seal motif.
        // Never used as a general UI color, so it stays special.
        seal: {
          DEFAULT: "#7A1F2B",
          soft: "#EEDCDE",
        },
        line: "#DDD5C3",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "6px",
        seal: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,20,32,0.05), 0 12px 28px -14px rgba(15,20,32,0.16)",
        raised: "0 1px 2px rgba(15,20,32,0.06), 0 20px 40px -16px rgba(15,20,32,0.22)",
      },
      letterSpacing: {
        wide2: "0.08em",
        wide3: "0.14em",
      },
    },
  },
  plugins: [],
};
export default config;
