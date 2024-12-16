module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          mauveover: '#ded0ee',
          cloudwhite: '#ffffff',
          salmon: '#f4a792',
          shadowgrey: '#b1b1be',
          orangesoda: '#f7bc56',
          aquamarine: '#add5d2',
          greymatter: '#d1dadf',
          oldlace: '#ffebe9',
          cottoncandy: '#ecd1eb'
        }
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      minHeight: {
        '64': '16rem',
      }
    },
  },
  plugins: [],
}