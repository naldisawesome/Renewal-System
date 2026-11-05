import type { Config } from "tailwindcss";

/*
 * The whole palette lives here, so every screen shares it.
 *  - `slate` is redefined as a cool neutral with a faint green undertone (paper, hairlines, ink).
 *  - `brand` is the single accent: a deep jade, used sparingly for actions and the current page.
 * Existing `slate-*` / `brand-*` classes across the app pick these up automatically.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f6f7f5",
          100: "#eef0ed",
          200: "#e1e5e2",
          300: "#c9cfcb",
          400: "#9aa39e",
          500: "#6b7570",
          600: "#4f5954",
          700: "#38413d",
          800: "#232b28",
          900: "#18201d",
          950: "#0f1513",
        },
        brand: {
          50: "#eaf3f1",
          100: "#d3e7e3",
          200: "#a8cfc7",
          300: "#73b2a6",
          400: "#3f9081",
          500: "#1d7465",
          600: "#0f5b50",
          700: "#0b4a41",
          800: "#093a33",
          900: "#072c27",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        pop: "0 1px 2px rgb(15 21 19 / 0.06), 0 12px 32px -8px rgb(15 21 19 / 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
