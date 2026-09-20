/** @type {import('tailwindcss').Config} */
// "primary" colour index.css ke CSS variables se aata hai (theme ek jagah badalne ke liye).
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: c("p50"),
          100: c("p100"),
          200: c("p200"),
          300: c("p300"),
          400: c("p400"),
          500: c("p500"),
          600: c("p600"),
          700: c("p700"),
        },
      },
    },
  },
  plugins: [],
};
