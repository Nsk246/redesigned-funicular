/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        state: {
          healthy:   "#22c55e",
          atrisk:    "#eab308",
          unstable:  "#f97316",
          critical:  "#ef4444",
          emergency: "#7c3aed",
        }
      }
    }
  },
  plugins: [],
}
