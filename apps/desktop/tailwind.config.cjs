const preset = require('@lipikit/ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // The UI package ships classes too; Tailwind must scan its source.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
