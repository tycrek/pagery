const { generate } = require('../dist/pagery');

generate({
	dir: './test',
	output: './html-module/',
	data: ['foo.json', 'meta.json'],
	exclude: ['notme.pug', 'head.pug']
})
	.then((data) => {
		console.log(`HTML files generated: ${Object.keys(data.pug).length}`);

		const cssLength = data.css instanceof Array ? data.css.length : 1;
		console.log(`CSS files generated: ${cssLength}`);

		console.log(`Module operation completed.`);
	})
	.catch((err) => (console.error(err), process.exit(1)));
