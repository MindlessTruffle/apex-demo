/** @type {import('tailwindcss').Config} */
    export default {
      // Point the content scanner to look at all your React files
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          // Add the custom font used in the app
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            serif: ['Georgia', 'Times New Roman', 'serif'], // Used for the branding/titles
          },
        },
      },
      plugins: [],
    }