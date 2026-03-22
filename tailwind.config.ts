import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(270 70% 55% / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(270 70% 55% / 0.6)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "wave": {
          "0%, 100%": { height: "4px" },
          "50%": { height: "20px" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.6s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "wave": "wave 1s ease-in-out infinite",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [
    require("tailwindcss-animate"),
    function ({ addBase, addComponents }) {
      addBase({
        ":root": {
          "--nav-height": "65px",
          "--player-height": "75px",
        },
        body: {
          "padding-bottom": "calc(var(--nav-height) + var(--player-height) + 20px)",
        },
        "@media (max-width: 768px)": {
          ":root": {
            "--nav-height": "60px",
            "--player-height": "70px",
          },
        },
      });
      addComponents({
        ".bottom-nav": {
          position: "fixed",
          bottom: "0",
          left: "0",
          right: "0",
          height: "var(--nav-height)",
          zIndex: "10000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(20,20,30,0.9)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 -5px 30px rgba(0,0,0,0.6)",
          borderRadius: "20px 20px 0 0",
        },
        ".bottom-nav ul": {
          display: "flex",
          width: "350px" /* 5 items * 70px */,
          position: "relative",
        },
        ".bottom-nav .list": {
          listStyle: "none",
          position: "relative",
          width: "70px",
          height: "60px",
          zIndex: "2",
        },
        ".bottom-nav .list a": {
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          width: "100%",
          textAlign: "center",
          fontWeight: "500",
        },
        ".bottom-nav .list a .icon": {
          position: "relative",
          display: "block",
          lineHeight: "65px",
          fontSize: "1.5em",
          transition: "0.5s",
          color: "hsl(var(--foreground))",
        },
        ".bottom-nav .list.active a .icon": {
          transform: "translateY(-32px)",
          color: "hsl(var(--accent))",
        },
        ".bottom-nav .list a .text": {
          position: "absolute",
          color: "hsl(var(--foreground))",
          fontWeight: "400",
          fontSize: "0.75em",
          letterSpacing: "0.05em",
          transition: "0.5s",
          opacity: "0",
          transform: "translateY(15px)",
        },
        ".bottom-nav .list.active a .text": {
          transform: "translateY(10px)",
          opacity: "1",
        },
        ".indicator": {
          position: "absolute",
          top: "-50%",
          width: "70px",
          height: "70px",
          background: "linear-gradient(135deg, #a855f7, #ec4899)",
          boxShadow: "0 0 20px rgba(168,85,247,0.6)",
          borderRadius: "50%",
          border: "6px solid hsl(var(--background))",
          transition: "0.5s",
          zIndex: "1",
        },
        ".indicator::before": {
          content: '""',
          position: "absolute",
          top: "50%",
          left: "-22px",
          width: "20px",
          height: "20px",
          background: "transparent",
          borderTopRightRadius: "20px",
          boxShadow: "1px -10px 0 0 hsl(var(--background))",
        },
        ".indicator::after": {
          content: '""',
          position: "absolute",
          top: "50%",
          right: "-22px",
          width: "20px",
          height: "20px",
          background: "transparent",
          borderTopLeftRadius: "20px",
          boxShadow: "-1px -10px 0 0 hsl(var(--background))",
        },
      });
    },
  ],
} satisfies Config;
