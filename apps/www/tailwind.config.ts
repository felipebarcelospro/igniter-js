import { type Config } from "tailwindcss";
const colors = require("tailwindcss/colors");
const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

const config = {
  darkMode: ["class"],
  prefix: "",
  content: ["./src/**/*.{ts,tsx,mdx}", "./mdx-components.tsx"],
  safelist: [
    {
      pattern: /hljs+/,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
    hljs: {
      custom: {
        base: {
          background: "transparent",
          color: "hsl(var(--foreground))",
        },
        general: {
          keyword: {
            color: "hsl(var(--secondary-foreground))",
            fontStyle: "italic",
          },
          built_in: {
            color: "hsl(var(--secondary-foreground))",
            fontStyle: "italic",
          },
          type: {
            color: "hsl(var(--foreground))",
          },
          literal: {
            color: "hsl(var(--secondary-foreground))",
          },
          number: {
            color: "hsl(var(--accent-foreground))",
          },
          regexp: {
            color: "hsl(var(--accent-foreground))",
          },
          string: {
            color: "hsl(var(--accent-foreground))",
          },
          subst: {
            color: "hsl(var(--accent-foreground))",
          },
          symbol: {
            color: "hsl(var(--accent-foreground))",
          },
          class: {
            color: "hsl(var(--foreground))",
          },
          function: {
            color: "hsl(var(--foreground))",
          },
          title: {
            color: "hsl(var(--foreground))",
          },
          params: {
            color: "hsl(var(--accent-foreground))",
          },
          comment: {
            color: "hsl(var(--muted-foreground))",
            fontStyle: "italic",
          },
        },
        meta: {
          keyword: {
            color: "hsl(var(--secondary-foreground))",
          },
          string: {
            color: "hsl(var(--accent-foreground))",
          },
        },
        tags: {
          name: {
            color: "hsl(var(--secondary-foreground))",
          },
          attr: {
            color: "hsl(var(--accent-foreground))",
          },
        },
        text: {
          emphasis: {
            fontStyle: "italic",
          },
          strong: {
            fontWeight: "bold",
          },
        },
      },
    },
  },
  plugins: [require("tailwind-highlightjs"), require("tailwindcss-animate")],
} satisfies Config;

export default config;

function addVariablesForColors({ addBase, theme }: any) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val]),
  );

  addBase({
    ":root": newVars,
  });
}
