import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#fdf2f4",
                    100: "#f8e0e5",
                    200: "#f0bfc9",
                    300: "#e0909f",
                    400: "#c96478",
                    500: "#a3435a",
                    600: "#8a2e46",
                    700: "#7a2e40",
                    800: "#5b1a2a",
                    900: "#3e1018",
                    950: "#1a0a0e",
                },
                gold: {
                    50: "#fdfaed",
                    100: "#faf3ce",
                    200: "#f0dfa0",
                    300: "#dfc494",
                    400: "#c9a96e",
                    500: "#b8944a",
                    600: "#a07a30",
                    700: "#856425",
                    800: "#6d5020",
                    900: "#5a421c",
                },
                cream: {
                    50: "#fefdfb",
                    100: "#fcf9f3",
                    200: "#f8f4ee",
                    300: "#ede6da",
                    400: "#ddd4c4",
                    500: "#c5b9a8",
                },
                dark: {
                    50: "#f7f7f8",
                    100: "#eeeef0",
                    200: "#d9d9de",
                    300: "#b8b8c1",
                    400: "#91919f",
                    500: "#737384",
                    600: "#5d5d6c",
                    700: "#4c4c58",
                    800: "#41414b",
                    900: "#1e1e24",
                    950: "#141418",
                },
            },
            fontFamily: {
                sans: ["Inter", "Noto Sans JP", "Noto Sans SC", "sans-serif"],
                display: ["Cormorant Garamond", "Playfair Display", "serif"],
            },
        },
    },
    plugins: [],
};
export default config;
