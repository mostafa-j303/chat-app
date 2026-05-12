import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        "auth-pop": "0 26px 80px rgba(8, 8, 8, 0.32)",
        "chat-glow": "0 18px 48px rgba(45, 212, 191, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
