/** @type {import('tailwindcss').Config} */
// const plugin = require("tailwindcss/plugin");

module.exports = {
	darkMode: "class",
	content: [
		"./pages/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",
		"./app/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				primary: "#4F46E5", // Updated to a more vibrant indigo
				"primary-dark": "#4338CA",
				"primary-light": "#818CF8",
				secondary: "#10B981", // Green
				accent: "#F59E0B", // Amber for accents
				"dark-bg": "#0F172A", // Deeper blue-black
				"dark-card": "#1E293B", // Slate dark
				"dark-border": "#334155", // Slate border
				"light-bg": "#F8FAFC",
				"light-card": "#FFFFFF",
				"light-border": "#E2E8F0",
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
				display: ["Inter", "sans-serif"],
			},
			animation: {
				"fade-in-up": "fadeInUp 0.6s ease-out",
				"fade-in": "fadeIn 0.5s ease-out",
				"slide-in": "slideIn 0.4s ease-out",
				"pulse-slow": "pulse 3s infinite",
				marquee1: "marquee1 40s linear infinite",
				marquee2: "marquee2 40s linear infinite",
				"scale-in": "scaleIn 0.4s ease-out",
				"slide-in-right": "slideInRight 0.5s ease-out",
				"slide-in-left": "slideInLeft 0.5s ease-out",
				"bounce-light": "bounce 2s ease-in-out infinite",
				floating: "floating 3s ease-in-out infinite",
			},
			keyframes: {
				fadeInUp: {
					"0%": { opacity: 0, transform: "translateY(20px)" },
					"100%": { opacity: 1, transform: "translateY(0)" },
				},
				fadeIn: {
					"0%": { opacity: 0 },
					"100%": { opacity: 1 },
				},
				slideIn: {
					"0%": { transform: "translateX(-100%)" },
					"100%": { transform: "translateX(0)" },
				},
				slideInRight: {
					"0%": { transform: "translateX(-20px)", opacity: 0 },
					"100%": { transform: "translateX(0)", opacity: 1 },
				},
				slideInLeft: {
					"0%": { transform: "translateX(20px)", opacity: 0 },
					"100%": { transform: "translateX(0)", opacity: 1 },
				},
				scaleIn: {
					"0%": { transform: "scale(0.9)", opacity: 0 },
					"100%": { transform: "scale(1)", opacity: 1 },
				},
				marquee1: {
					"0%": { transform: "translateX(0%)" },
					"100%": { transform: "translateX(-100%)" },
				},
				marquee2: {
					"0%": { transform: "translateX(100%)" },
					"100%": { transform: "translateX(0%)" },
				},
				floating: {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-10px)" },
				},
			},
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"gradient-conic":
					"conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
				"gradient-mesh":
					"linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('/images/mesh-bg.svg')",
			},
			boxShadow: {
				soft: "0 4px 20px rgba(0, 0, 0, 0.08)",
				glow: "0 0 15px rgba(79, 70, 229, 0.5)",
				"inner-glow": "inset 0 0 10px rgba(79, 70, 229, 0.2)",
			},
		},
	},
	plugins: [],
};
