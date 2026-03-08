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
        ink: "#20303c",
        mist: "#f5f1e8",
        panel: "#fbf8f2",
        line: "#d8d1c2",
        accent: "#44606d",
        "accent-soft": "#d8e3e5",
        success: "#58736a",
        warn: "#8e6d4f",
        danger: "#8d5d5d"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      },
      boxShadow: {
        panel: "0 1px 2px rgba(32, 48, 60, 0.04), 0 6px 20px rgba(32, 48, 60, 0.07)",
        card: "0 2px 8px rgba(32, 48, 60, 0.08), 0 16px 40px rgba(32, 48, 60, 0.07)",
        sm: "0 1px 3px rgba(32, 48, 60, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
