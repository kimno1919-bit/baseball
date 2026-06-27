import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#1E3A5F",
          dark: "#4A77B5",
          DEFAULT: "#1E3A5F",
        },
        secondary: {
          light: "#2D6A4F",
          dark: "#52B788",
          DEFAULT: "#2D6A4F",
        },
        customBg: {
          light: "#FFFFFF",
          dark: "#0F172A",
        },
        surface: {
          light: "#F8FAFC",
          dark: "#1E293B",
        },
        customText: {
          light: "#1E293B",
          dark: "#F1F5F9",
        },
        customBorder: {
          light: "#E2E8F0",
          dark: "#334155",
        },
        success: {
          light: "#16A34A",
          dark: "#22C55E",
          DEFAULT: "#16A34A",
        },
        warning: {
          light: "#EA580C",
          dark: "#FB923C",
          DEFAULT: "#EA580C",
        },
        danger: {
          light: "#DC2626",
          dark: "#EF4444",
          DEFAULT: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
