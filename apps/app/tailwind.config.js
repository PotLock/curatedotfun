/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // This ensures dark mode only activates with the 'dark' class
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        londrina: ["Londrina Solid", "sans-serif"],
      },
      boxShadow: {
        sharp: "4px 4px 0 rgba(0, 0, 0, 1)",
        "sharp-hover": "6px 6px 0 rgba(0, 0, 0, 1)",
      },
      colors: {
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
    },
  },
  plugins: [typography],
};
