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
	output: string;

	// Tailwind CSS file. Can be a string or an array of strings.
	tailwindFile: string | string[];

	// Tailwind config file
	tailwindConfigFile: string;

	// PostCSS plugins. Can be a string or an array of strings.
	postcssPlugins: string | string[];

	// Directory to run in
	dir?: string;

	// Data files to pass to Pug. Can be a string or an array of strings of JSON files.
	data?: string | string[];

	// Files to exclude from rendering. Can be a string or an array of strings.
	exclude?: string | string[];
}

const DEFAULT_OPTIONS: Options = {
	views: 'views/',
	output: 'html/',
	tailwindFile: 'tailwind.css',
	tailwindConfigFile: 'tailwind.config.js',
	postcssPlugins: [],
};

// Compile CSS
const css = (options: Options): Promise<string | { [key: string]: string }> => new Promise((resolve, reject) => {

	// Load PostCSS plugins
	const plugins = [
		tailwindcss({ config: options.tailwindConfigFile }),
		require('autoprefixer')(),
		require('cssnano')(),
		require('@tinycreek/postcss-font-magician')({ protocol: 'https:' })
	];

	// Load user-defined PostCSS plugins
	if (typeof options.postcssPlugins !== 'string')
		options.postcssPlugins.forEach((plugin) => plugins.push(require(plugin)())); // todo: eventually somehow support plugin options

	// Compile the CSS file with PostCSS
	const compileCss = (filepath: string, filename: string) =>
		fs.readFile(filepath)
			.then((bytes) => postcss(plugins).process(bytes, { from: filepath, to: filepath }))
			.then((result) => {
				if (result.warnings && result.warnings().length) throw new Error(result.warnings().join(', '));
				log.debug(`Compiled ${filename}`);
				return result.css;
			});

	// If array, we'll save to a map so the CSS can be accessed by filename
	const css: { [key: string]: string } = {};
	return Array.isArray(options.tailwindFile)
		? Promise.all([
			log.debug(`Compiling ${options.tailwindFile.length} Tailwind CSS files`),
			...options.tailwindFile.map((file) => compileCss(path(file), file).then((data) => css[file.match(/^(.*)(?=\.)/g)![0]] = data))
		])
			.then(() => resolve(css))
			.catch(reject)

		// Otherwise, just compile the one file
		: compileCss(path(options.tailwindFile), options.tailwindFile)
			.then((data) => resolve(data))
			.catch(reject);
});

const generate = (options: Options) => {

	let data: any = {};

	// Load data files
	let dataLoaders: Promise<void>[] = [];
	if (options.data && options.data.constructor === Array) {
		log.debug('Loading data files');
		dataLoaders = options.data.map((file): Promise<void> => new Promise((resolve, reject) => {
			const filename = file.split('/').pop()?.split('.').shift() || null;
			return !filename
				? resolve(void 0)
				: fs.readJson(file)
					.then((json) => data[filename] = json)
					.then(resolve)
					.catch(reject);
		}));
	}

	// Load all the data files
	Promise.all(dataLoaders)

		// Compile the CSS
		.then(() => css(options))
		.then((css) =>

			// Compile all the Pug files
			fs.readdir(options.views)
				.then((files) => files.filter((file) => file.endsWith('.pug')))
				.then((files) => files.map((file) => file.replace('.pug', '')))
				.then((files) => Promise.all(files.map((file) => {

					// Check if file is excluded
					if (options.exclude && (options.exclude.toString() === file.concat('.pug') || Array.isArray(options.exclude) && options.exclude.find((exclude) => exclude === file.concat('.pug'))))
						return Promise.resolve();

					// Compile Pug file
					const pugFile = `${options.views}${file}.pug`;
					const htmlFile = `${options.output}${file}.html`;
					return fs.ensureFile(htmlFile)
						.then(() => pug.renderFile(pugFile, { css, data }))
						.then((html) => fs.writeFile(htmlFile, html))
						.then(() => log.info(`Generated ${htmlFile}`));
				})))
				.then(() => log.success('Generated all files'))
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
	 * --exclude=views/_head.pug    # File(s) to exclude from rendering
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

	// Parse Tailwind CSS files
	if (typeof options.tailwindFile === 'string')
		options.tailwindFile = options.tailwindFile.split(',');

	// Split PostCSS plugins into an array
	if (typeof options.postcssPlugins === 'string')
		options.postcssPlugins = options.postcssPlugins.split(',');

	// Convert data files to an array
	if (typeof options.data === 'string')
		options.data = options.data.split(',');

	// Convert exclude files to an array
	if (typeof options.exclude === 'string')
		options.exclude = options.exclude.split(',');

	// Check if files exist
	Promise.all([
		fs.access(`${options.views}index.pug`),
		!Array.isArray(options.tailwindFile) ? fs.access(path(options.tailwindFile)) : Promise.all(options.tailwindFile.map((file) => fs.access(path(file)))),
		fs.access(options.tailwindConfigFile),
		fs.ensureDir(options.output)
	])
		.then(() => log.debug('Files exist'))
		.then(() => generate(options))
		.catch((err) => (console.log(err), log.error(err), process.exit(1)));
} else {
	log.error('Fuck off, module not implemented yet');
	process.exit(1);
}