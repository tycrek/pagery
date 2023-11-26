import { generate } from '../dist/pagery.js';

generate({
	dir: './test',
	output: './html-module/',
	data: ['foo.json', 'meta.json', 'iter.json'],
	exclude: ['notme.pug', 'head.pug'],
	tailwindFile: ['tailwind.css', 'tailwind.2.css']
})
	.then((data) => {
		const html = Object.keys(data.pug).length,
			css = typeof data.css === 'object' ? Object.entries(data.css).length : 1;

		console.log(`HTML files generated:`, html);
		console.log(`CSS files generated:`, css);
		console.log(`Module operation completed.`);
	})
	.catch((err) => (console.error(err), process.exit(1)));
