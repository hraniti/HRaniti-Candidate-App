import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Navy ink — the demo's primary/authority color, replacing the
        // near-black "engraved letterhead" ink across the whole app.
        ink: {
          DEFAULT: "#16213E",
          light: "#1F2D50",
          soft: "#3A4460",
          faint: "#8A93A6",
        },
        // Cool paper — replaces warm parchment. Cards sit on it in true
        // white for contrast, same structure as before, different mood.
        paper: {
          DEFAULT: "#F3F4F6",
          raised: "#FFFFFF",
          deep: "#E7E9ED",
        },
        // "gold" token kept for backward compatibility with existing
        // components (password-strength, low-confidence states) but now
        // carries the demo's amber, not literal gold.
        gold: {
          DEFAULT: "#B9791F",
          deep: "#8F5C13",
          soft: "#FBF0DE",
        },
        // Teal — the demo's verification/success color, replacing forest
        // green.
        verified: {
          DEFAULT: "#0E7C71",
          soft: "#E4F3F1",
        },
        alert: {
          DEFAULT: "#B54430",
          soft: "#FBEBE6",
        },
        // Reserved for the highest-stakes verification moments (KYC,
        // Trusted Referrer). Uses the ink navy itself rather than a
        // separate hue, keeping the whole app inside the navy/teal/amber
        // family rather than introducing a fifth color.
        seal: {
          DEFAULT: "#16213E",
          soft: "#E3E6EC",
        },
        line: "#E1E4EA",

        // Brand accents pulled directly from the HRaniti logo mark — used
        // for the employer app's sidebar/dashboard so it reads as a real,
        // colorful product rather than the mostly-monochrome candidate side.
        brandViolet: { DEFAULT: "#7C3AED", soft: "#F1E8FE", deep: "#5B21B6" },
        brandCoral: { DEFAULT: "#FF4438", soft: "#FFEAE8", deep: "#C3271D" },
        brandCyan: { DEFAULT: "#06B6D4", soft: "#E0F7FB", deep: "#0E7490" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "6px",
        seal: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,33,62,0.05), 0 12px 28px -14px rgba(22,33,62,0.16)",
        raised: "0 1px 2px rgba(22,33,62,0.06), 0 20px 40px -16px rgba(22,33,62,0.22)",
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
