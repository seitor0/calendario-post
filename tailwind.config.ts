import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        skysoft: "#EEF5FF",
        sky: "#E8F2FF",
        skydeep: "#2563EB",
        violet: "#7C3AED",
        mint: "#22C55E",
        peach: "#F59E0B",
        danger: "#EF4444",
        sand: "#F8FAFC"
      },
      borderRadius: {
        xl: "18px"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
