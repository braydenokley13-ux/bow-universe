import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink:            "#0f172a",
        mist:           "#f8f9fb",
        panel:          "#ffffff",
        line:           "#e2e8f0",
        accent:         "#6366f1",
        "accent-soft":  "#e0e7ff",
        "accent-vivid": "#4f46e5",
        success:        "#16a34a",
        "success-soft": "#dcfce7",
        warn:           "#d97706",
        "warn-soft":    "#fef3c7",
        danger:         "#dc2626",
        "danger-soft":  "#fee2e2",
        info:           "#0284c7",
        "info-soft":    "#e0f2fe",
        lane: {
          tool:     "#7c3aed",
          policy:   "#0369a1",
          strategy: "#0f766e",
          econ:     "#b45309"
        }
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"]
      },
      boxShadow: {
        panel: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.10)",
        card:  "0 2px 8px rgba(15,23,42,0.08), 0 20px 48px rgba(15,23,42,0.14)",
        glow:  "0 0 0 1px rgba(99,102,241,0.15), 0 8px 24px rgba(99,102,241,0.12)",
        sm:    "0 1px 4px rgba(15,23,42,0.10)"
      }
    }
  },
  plugins: []
};

export default config;
