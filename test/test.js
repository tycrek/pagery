const { generate, css } = require('../dist/pagery');
const fs = require('fs');
const path = (...args) => require('path').join(process.cwd(), ...args);

generate({
	dir: path('test'),
	views: 'views/',
	data: ['foo.json', 'meta.json'],
	tailwindFile: 'tailwind.css',
	tailwindConfigFile: 'tailwind.config.js',
}).then((results) => {
	if (!results) return;
	Object.entries(results).forEach(([name, html]) => {
		// check if output/ exists
		if (!fs.existsSync(path('output')))
			fs.mkdirSync(path('output'));

		// Write
		fs.writeFileSync(path('output', `${name}.html`), html);
		console.log(`Wrote ${name}`);
	});
}).catch(console.error);
