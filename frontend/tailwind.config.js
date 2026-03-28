/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        secondary: "#1E293B",
        accent: "#22C55E",
        danger: "#EF4444",
        warning: "#EAB308",
        surface: "#F8FAFC",
        page: "#F1F5F9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.25s ease-out",
        slideUp: "slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        spinSlow: "spinSlow 0.85s linear infinite",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        modal: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
};
