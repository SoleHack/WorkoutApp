/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:     '#0C0C0B',
        card:   '#141412',
        border: '#2A2A26',
        text:   '#E8E3D8',
        muted:  '#6B6860',
        push:   '#F59E0B',
        pull:   '#38BDF8',
        legs:   '#4ADE80',
        core:   '#E2D9C8',
        danger: '#F87171',
        success:'#4ADE80',
      },
      fontFamily: {
        bebas:    ['BebasNeue'],
        mono:     ['DMMono'],
        monoMed:  ['DMMono_500'],
        sans:     ['DMSans'],
        sansMed:  ['DMSans_500'],
      },
    },
  },
  plugins: [],
}
