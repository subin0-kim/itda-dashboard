import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Pretendard", "system-ui", "sans-serif"],
      },
      colors: {
        itda: {
          ink: "#172033",
          muted: "#667085",
          panel: "#ffffff",
          line: "#d8dee8",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
