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
        ink: "var(--color-ink)",
        page: "var(--color-page)",
        surface: "var(--color-surface)",
        primary: "var(--color-primary)",
        "primary-strong": "var(--color-primary-strong)",
        accent: "var(--color-accent)",
        cyan: "var(--color-cyan)",
        lime: "var(--color-lime)",
        coral: "var(--color-coral)",
        success: "var(--color-success)",
        muted: "var(--color-muted)",
        border: "var(--color-border)"
      },
      boxShadow: {
        shell: "0 22px 70px rgb(13 11 104 / 18%)",
        card: "0 10px 26px rgb(13 11 104 / 8%)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
