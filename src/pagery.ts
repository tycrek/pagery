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
	// Pug views directory
	views: string;

	// Output directory
	output: string;

	// Tailwind CSS file
	tailwindFile: string;

	// Tailwind config file
	tailwindConfigFile: string;

	// PostCSS plugins
	postcssPlugins: string | string[];

	// Directory to run in
	dir?: string;
}

const DEFAULT_OPTIONS: Options = {
	// Pug views directory
	views: 'views/',

	// Output directory
	output: 'html/',

	// Tailwind CSS file
	tailwindFile: 'tailwind.css',

	// Tailwind config file
	tailwindConfigFile: 'tailwind.config.js',

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

const generate = (options: Options) =>
	css(options).then((css) =>
		fs.readdir(options.views)
			.then((files) => files.filter((file) => file.endsWith('.pug')))
			.then((files) => files.map((file) => file.replace('.pug', '')))
			.then((files) => Promise.all(files.map((file) => {
				const pugFile = `${options.views}${file}.pug`;
				const htmlFile = `${options.output}${file}.html`;
				return fs.ensureFile(htmlFile)
					.then(() => pug.renderFile(pugFile, { css }))
					.then((html) => fs.writeFile(htmlFile, html))
					.then(() => log.info(`Generated ${htmlFile}`))
			})))
			.then(() => log.success('Generated all files'))
			.catch((err) => log.error(err)));

// Check if being run on the command line
if (require.main === module) {

	/*
	 * Parse command line arguments
	 *
	 * --views=views/               # Pug main file
	 * --output=html/               # Output directory
	 * --tailwindFile=tailwind.css  # Tailwind CSS file
	 * --tailwindConfigFile=tailwind.config.js  # Tailwind config file
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
	const fixSlashes = (str: string) => str.concat(str.includes('/') ? '/' : '\\').replaceAll('//', '/').replaceAll('\\\\', '\\');
	options.views = fixSlashes(path(options.views));
	options.output = fixSlashes(path(options.output));
	options.tailwindFile = path(options.tailwindFile);

	// Split PostCSS plugins into an array
	if (typeof options.postcssPlugins === 'string')
		options.postcssPlugins = options.postcssPlugins.split(',');

	// Check if files exist
	Promise.all([fs.access(`${options.views}index.pug`), fs.access(options.tailwindFile), fs.access(options.tailwindConfigFile), fs.ensureDir(options.output)])
		.then(() => log.debug('Files exist'))
		.then(() => generate(options))
		.catch((err) => (console.log(err), log.error(err), process.exit(1)));
} else {
	log.error('Fuck off, module not implemented yet');
	process.exit(1);
}