/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        weekend: "#fefce8",
        holiday: "#fef9c3",
        today: "#dbeafe",
      },
    },
  },
  plugins: [],
};
