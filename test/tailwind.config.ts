import { Config } from 'tailwindcss';

export default {
	separator: '_',
	darkMode: 'class',
	plugins: [],
	content: ['./views/**/*.pug'],
	theme: {
		extend: {
			fontFamily: {
				main: ['"Lato"', 'ui-sans-serif', 'system-ui', 'sans-serif']
			}
		}
	}
} satisfies Config;
