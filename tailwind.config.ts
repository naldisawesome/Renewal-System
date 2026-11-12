import type { Config } from "tailwindcss";

/*
 * The whole palette lives here, so every screen shares it.
 *  - `slate` is a cool neutral with a faint green undertone (paper, hairlines, ink).
 *  - `brand` is the single accent: a deep jade, used for actions and the current page.
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
        // Deep ink for the floating actions bar and the sign-in panel.
        ink: { 800: "#1c2723", 900: "#16201d", 950: "#0f1513" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // One family across the app; `font-serif` stays as an alias so older markup keeps working.
        serif: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pop: "0 1px 2px rgb(15 21 19 / 0.06), 0 14px 36px -10px rgb(15 21 19 / 0.2)",
        card: "0 1px 0 rgb(15 21 19 / 0.03), 0 1px 3px rgb(15 21 19 / 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
