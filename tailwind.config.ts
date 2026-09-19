import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chalk: "#F2F4F1",
        paper: "#FBFCFA",
        ink: "#17231E",
        pine: "#4C5F55",
        mist: "#D9DFDA",
        cobalt: { DEFAULT: "#2B4EFF", dark: "#1F3BD1" },
        hot: "#1E8A57",
        warm: "#C98A00",
        cold: "#8A958F",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Instrument Sans Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
