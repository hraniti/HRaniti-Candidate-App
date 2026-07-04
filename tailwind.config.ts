import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12172B",
          light: "#1E2646",
          soft: "#5B6472",
        },
        paper: {
          DEFAULT: "#F4F5F7",
          raised: "#FFFFFF",
        },
        gold: {
          DEFAULT: "#C79A46",
          soft: "#EADFC5",
        },
        verified: {
          DEFAULT: "#1F7A5C",
          soft: "#DCEFE6",
        },
        alert: {
          DEFAULT: "#C4514B",
          soft: "#F5DEDC",
        },
        line: "#E2E4E9",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
        seal: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,23,43,0.04), 0 8px 24px -12px rgba(18,23,43,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
