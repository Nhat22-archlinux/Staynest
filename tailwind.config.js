/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.12)",
      },
      colors: {
        ink: "#172033",
        ocean: "#0e7490",
        coral: "#e76f51",
        mint: "#2a9d8f",
      },
    },
  },
  plugins: [],
};
