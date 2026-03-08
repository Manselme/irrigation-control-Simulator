/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#1e293b", border: "#334155" },
        muted: "#94a3b8",
      },
    },
  },
  plugins: [],
};
