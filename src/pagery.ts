#!/usr/bin/env node

import Path from 'path';
import postcss from 'postcss';
import pug from 'pug';
import fs from 'fs-extra';
import tailwindcss from 'tailwindcss';
import { Logger } from './logger';

const path = (...args: string[]) => Path.join(process.cwd(), ...args);

const pkg: { name: string, version: string, homepage: string } = fs.readJsonSync(Path.join(__dirname, '../package.json'));
const log = new Logger(`${pkg.name} v${pkg.version} |`);

interface Options {
	// Pug views directory
	views: string;

	// Output directory
	output?: string;

	// Tailwind CSS file
	tailwindFile: string;

	// Tailwind config file
	tailwindConfigFile: string;

	// PostCSS plugins
	postcssPlugins?: string | string[];

	// Directory to run in
	dir?: string;

	// Data files to pass to Pug. Can be a string or an array of strings of JSON files.
	data?: string | string[];
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
export const css = (options: Options) => new Promise((resolve, reject) => {

	// Load PostCSS plugins
	const plugins = [
		tailwindcss({ config: options.tailwindConfigFile }),
		require('autoprefixer')(),
		require('cssnano')(),
		require('postcss-font-magician')({ protocol: 'https:' })
	];

	// Load user-defined PostCSS plugins
	if (typeof options.postcssPlugins !== 'string')
		options.postcssPlugins?.forEach((plugin) => plugins.push(require(plugin)()));

	// Compile CSS
	fs.readFile(options.tailwindFile)
		.then((bytes) => postcss(plugins).process(bytes, { from: options.tailwindFile, to: options.tailwindFile }))
		.then((result) => {
			if (result.warnings && result.warnings().length) throw new Error(result.warnings().join(', '));
			log.debug('Compiled CSS');
			return result.css;
		})
		.then(resolve)
		.catch(reject);
});

export const generate = (options: Options) => {
	const isModule = require.main !== module;

	// if module, don't write the html, but return the html
	const html: { [key: string]: string } = {};
	if (isModule)
		log.debug(`Generating HTML: ${isModule ? 'as module' : 'as CLI'}`);

	if (isModule && options.dir) {
		log.debug(`Changing directory to ${options.dir}`);
		process.chdir(options.dir);
	}

	let data: any = {};

	// Load data files
	let dataLoaders: Promise<void>[] = [];
	if (options.data && options.data.constructor === Array) {
		log.debug('Loading data files');
		dataLoaders = options.data.map((file): Promise<void> => new Promise((resolve, reject) => {
			const filename = file.replace('\\\\', '/').split('/').pop()?.split('.').shift() || null;
			return !filename
				? resolve(void 0)
				: fs.readJson(file)
					.then((json) => data[filename] = json)
					.then(resolve)
					.catch(reject);
		}));
	}

	// Load all the data files
	return Promise.all(dataLoaders)

		// Compile the CSS
		.then(() => css(options))
		.then((css) =>

			// Compile all the Pug files
			fs.readdir(options.views)
				.then((files) => files.filter((file) => file.endsWith('.pug')))
				.then((files) => files.map((file) => file.replace('.pug', '')))
				.then((files) => Promise.all(files.map((filename) => {
					const pugFile = `${options.views}${filename}.pug`;
					const htmlFile = `${options.output}${filename}.html`;
					const rendered = pug.renderFile(pugFile, { css, data });

					return isModule
						? (html[filename] = rendered, Promise.resolve())
						: fs.ensureFile(htmlFile)
							.then(() => fs.writeFile(htmlFile, rendered))
							.then(() => log.info(`Generated ${htmlFile}`));
				})))
				.then(() => log.success('Rendered all Pug files'))
				.then(() => isModule ? html : void 0)
				.catch((err) => log.error(err)))
};

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
	 * --data=data.json             # Data file(s) to pass to Pug
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

	// Convert data files to an array
	if (typeof options.data === 'string')
		options.data = options.data.split(',');

	// Check if files exist
	Promise.all([fs.access(`${options.views}index.pug`), fs.access(options.tailwindFile), fs.access(options.tailwindConfigFile), fs.ensureDir(options.output)])
		.then(() => log.debug('Files exist'))
		.then(() => generate(options))
		.catch((err) => (console.log(err), log.error(err), process.exit(1)));
}
