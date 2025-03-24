/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
