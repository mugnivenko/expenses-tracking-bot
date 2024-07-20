/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      height: {
        viewportStable: "var(--tg-viewport-stable-height)",
        viewport: "var(--tg-viewport-height)",
      },
      colors: {
        background: "var(--tg-theme-bg-color)",
        text: "var(--tg-theme-text-color)",
        hint: "var(--tg-theme-hint-color)",
        link: "var(--tg-theme-link-color)",
        button: "var(--tg-theme-button-color)",
        buttonText: "var(--tg-theme-button-text-color)",
        secondaryBg: "var(--tg-theme-secondary-bg-color)",
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          "primary": "#5288c1",
          "secondary": "#6ab3f3",
          "accent": "#6ab2f2",
          "neutral": "#232e3c",
          "base-100": "#17212b",
          "info": "#6ab3f3",
          "success": "#009485",
          "warning": "#ff9900",
          "error": "#ec3942",

          "base-content": "#f5f5f5",
          "base-200": "#c3d9f1",
          "base-300": "#708499",
          "base-400": "#6ab3f3",

          "header-bg": "#17212b",
          "section-bg": "#17212b",
          "section-header-text": "#6ab3f3",

          "button-color": "#5288c1",
          "button-text-color": "#ffffff",
          "link-color": "#6ab3f3",

          "hint-color": "#708499",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "primary": "#40a7e3",
          "secondary": "#168acd",
          "accent": "#168acd",
          "neutral": "#f1f1f1",
          "base-100": "#ffffff",
          "info": "#168acd",
          "success": "#009485",
          "warning": "#ff9900",
          "error": "#d14e4e",

          "base-content": "#000000",
          "base-200": "#999999",

          "button-color": "#40a7e3",
          "button-text-color": "#ffffff",
          "link-color": "#168acd",

          "header-bg": "#ffffff",
          "section-bg": "#ffffff",
          "section-header-text": "#168acd",

          "hint-color": "#999999",
        },
      },
    ],
  },
  plugins: [
    require("daisyui")
  ],
};
