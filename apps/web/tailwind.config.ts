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
        // M3 Surface System
        "surface-dim": "#101419",
        "surface": "#101419",
        "surface-bright": "#36393f",
        "surface-container-lowest": "#0a0e13",
        "surface-container-low": "#181c21",
        "surface-container": "#1c2025",
        "surface-container-high": "#262a30",
        "surface-container-highest": "#31353b",
        "surface-variant": "#31353b",
        // M3 Primary
        "primary": "#b5c4ff",
        "primary-container": "#2f6bff",
        "on-primary": "#00297a",
        "on-primary-container": "#000318",
        "primary-fixed": "#dbe1ff",
        "primary-fixed-dim": "#b5c4ff",
        // M3 Secondary
        "secondary": "#b5c4ff",
        "secondary-container": "#2e4382",
        "on-secondary": "#142c6a",
        "on-secondary-container": "#9eb2f9",
        // M3 Tertiary
        "tertiary": "#ffb596",
        "tertiary-container": "#cb4f00",
        "on-tertiary": "#581e00",
        "on-tertiary-container": "#ffffff",
        "tertiary-fixed": "#ffdbcd",
        "tertiary-fixed-dim": "#ffb596",
        // M3 Error
        "error": "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        // M3 Neutral / Surface text
        "on-surface": "#e0e2ea",
        "on-surface-variant": "#c3c5d8",
        "on-background": "#e0e2ea",
        "outline": "#8d90a1",
        "outline-variant": "#434655",
        // Inverse
        "inverse-surface": "#e0e2ea",
        "inverse-on-surface": "#2d3136",
        "inverse-primary": "#0051e0",
        // Legacy aliases (keep for existing components)
        "bg-base": "#0B0F14",
        "success": "#16A34A",
        "warning": "#F59E0B",
        "danger": "#EF4444",
      },
      fontFamily: {
        headline: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        label: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
