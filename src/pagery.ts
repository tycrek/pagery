#!/usr/bin/env node

import Path from 'path';
import postcss from 'postcss';
import pug from 'pug';
import fs from 'fs-extra';
import tailwindcss from 'tailwindcss';
import { Logger, CLI_COLOURS } from './logger';

const path = (...args: string[]) => Path.join(process.cwd(), ...args);

const pkg: { name: string, version: string, homepage: string } = fs.readJsonSync(Path.join(__dirname, '../package.json'));
const log = new Logger(`${pkg.name} v${pkg.version} |`);

interface Options {
	// Pug main file
	pugFile: string;

	// Tailwind CSS file
	tailwindFile: string;

	// Tailwind config file
	tailwindConfigFile: string;

	// Output HTML file
	htmlFile: string;

	// PostCSS plugins
	postcssPlugins: string | string[];

	// Directory to run in
	dir?: string;
}

const DEFAULT_OPTIONS: Options = {
	// Pug main file
	pugFile: 'views/main.pug',

	// Tailwind CSS file
	tailwindFile: 'tailwind.css',

	// Tailwind config file
	tailwindConfigFile: 'tailwind.config.js',

	// Output HTML file
	htmlFile: 'html/index.html',

	// PostCSS plugins
	postcssPlugins: [],
};

// Compile CSS
const css = (options: Options) => new Promise((resolve, reject) => {

	// Load PostCSS plugins
	const plugins = [
		tailwindcss({ config: options.tailwindConfigFile }),
		require('autoprefixer')(),
		require('cssnano')(),
		require('postcss-font-magician')({ protocol: 'https:' })
	];

	// Load user-defined PostCSS plugins
	if (typeof options.postcssPlugins !== 'string')
		options.postcssPlugins.forEach((plugin) => plugins.push(require(plugin)()));

	// Compile CSS
	fs.readFile(options.tailwindFile)
		.then((bytes) => postcss(plugins).process(bytes, { from: options.tailwindFile, to: options.tailwindFile }))
		.then((result) => {
			if (result.warnings && result.warnings().length) throw new Error(result.warnings().join(', '));
			return result.css;
		})
		.then(resolve)
		.catch(reject);
});

const pugRender = (options: Options) => css(options).then((css) => pug.renderFile(options.pugFile, { css }));

const staticGen = (options: Options) => Promise.all([pugRender(options), fs.ensureFile(options.htmlFile)])
	.then(([html,]) => fs.writeFile(options.htmlFile, html));

// Check if being run on the command line
if (require.main === module) {

	/*
	 * Parse command line arguments
	 *
	 * --pugFile=views/main.pug     # Pug main file
	 * --tailwindFile=tailwind.css  # Tailwind CSS file
	 * --tailwindConfigFile=tailwind.config.js  # Tailwind config file
	 * --htmlFile=html/index.html   # Output file
	 * --dir=./                     # Run in this directory
	 */
	const args = process.argv.slice(2).reduce((acc, arg) => {
		const [key, value] = arg.split('=');
		acc[key.replaceAll('--', '')] = value;
		return acc;
	}, {} as Record<string, string>);

	// Merge default options with command line arguments
	const options: Options = {
		...DEFAULT_OPTIONS,
		...args,
	};

	// Change directory if specified
	if (options.dir)
		process.chdir(options.dir);

	// Convert paths to absolute paths
	options.pugFile = path(options.pugFile);
	options.tailwindFile = path(options.tailwindFile);
	options.htmlFile = path(options.htmlFile);

	// Split PostCSS plugins into an array
	if (typeof options.postcssPlugins === 'string')
		options.postcssPlugins = options.postcssPlugins.split(',');

	// Check if files exist
	Promise.all([fs.access(options.pugFile), fs.access(options.tailwindFile), fs.access(options.tailwindConfigFile)])
		.then(() => log.debug('Files exist'))
		.then(() => staticGen(options))
		.then(() => log.success(`Done, saved to ${CLI_COLOURS.turquoise}${options.htmlFile}`))
		.catch((err) => (console.log(err), log.error(err), process.exit(1)));
} else {
	log.error('Fuck off, module not implemented yet');
	process.exit(1);
}