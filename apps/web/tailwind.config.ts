import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0B0F14",
          surface: "#111827",
          "surface-raised": "#1F2937",
          "surface-overlay": "#243041",
        },
        border: {
          default: "#2D3748",
          focus: "#2F6BFF",
        },
        primary: "#2F6BFF",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#EF4444",
        text: {
          primary: "#F9FAFB",
          secondary: "#D1D5DB",
          muted: "#9CA3AF",
          disabled: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        input: "6px",
        card: "10px",
        modal: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
