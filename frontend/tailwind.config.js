/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Preflight is disabled so Tailwind's CSS reset does not fight with
  // MUI's CssBaseline; Tailwind is used for utility classes only.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      screens: {
        xs: '0px',
        sm: '600px',
        md: '900px',
        lg: '1200px',
        xl: '1536px',
      },
    },
  },
  plugins: [],
};
