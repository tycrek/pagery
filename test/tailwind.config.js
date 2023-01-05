module.exports = {
	separator: '_',
	darkMode: 'class',
	plugins: [
		// require('tailwindcss-textshadow'),
	],
	content: ['./views/**/*.pug'],
	theme: {
		extend: {
			fontFamily: {
				main: ['"Lato"', 'ui-sans-serif', 'system-ui', 'sans-serif']
			}
		}
	}
}
