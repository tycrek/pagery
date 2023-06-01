#!/usr/bin/env node

import Path from 'path';
import postcss from 'postcss';
import pug from 'pug';
import fs from 'fs-extra';
import tailwindcss from 'tailwindcss';
import { Logger } from './logger';
import { Options, ConfigFile } from './Options';
import { PageryError } from './PageryError';

const path = (...args: string[]) => Path.join(process.cwd(), ...args);

const pkg: { name: string, version: string, homepage: string } = fs.readJsonSync(Path.join(__dirname, '../package.json'));
const log = new Logger(`${pkg.name} v${pkg.version} |`);

const DEFAULT_OPTIONS: Options = {
	views: 'views/',
	output: 'html/',
	tailwindFile: 'tailwind.css',
	tailwindConfigFile: 'tailwind.config.js',
	postcssPlugins: [],
};

/**
 * Quick function to change directory & log it
 */
const chdir = (dir: string) => {
	process.chdir(dir);
	log.debug(`Changed directory to ${dir}`);
};

/**
 * Reads the provided config file
 */
const readConfigFile = (file: string): Promise<Options> => new Promise(async (resolve, reject) => {
	// Check if config file exists as-is
	let filePathValid = await fs.pathExists(file);

	// Try to fix with a path
	if (!filePathValid) {
		file = path(file);
		filePathValid = await fs.pathExists(file);
	}

	// If still invalid, reject
	if (!filePathValid)
		return reject(new PageryError(`Provided config ${file} does not seem to exist`, 'Make sure this file exists and there are no typos in your configuration.'));

	// Read the config file
	const rawConfig: ConfigFile = await fs.readJson(file);

	// Merge default options with config file options
	const options: Options = {
		...DEFAULT_OPTIONS,
		...rawConfig,
	};

	// Change directory if specified
	if (options.dir) chdir(options.dir);

	return resolve(options);
});

/**
 * Compile CSS
 */
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
	const compileCss = (filepath: string) =>
		fs.readFile(filepath)
			.then((bytes) => postcss(plugins).process(bytes, { from: filepath, to: filepath }))
			.then((result) => {
				if (result.warnings && result.warnings().length) throw new Error(result.warnings().join(', '));
				return result.css;
			});

	// If array, we'll save to a map so the CSS can be accessed by filename
	const css: { [key: string]: string } = {};
	return Array.isArray(options.tailwindFile)
		? Promise.all([...options.tailwindFile.map((file) => compileCss(path(file)).then((data) => css[file.match(/^(.*)(?=\.)/g)![0]] = data))])
			.then(() => resolve(options.tailwindFile.length > 1 ? css : Object.values(css)[0]))
			.catch(reject)

		// Otherwise, just compile the one file
		: compileCss(path(options.tailwindFile))
			.then((data) => resolve(data))
			.catch(reject);
});

/**
 * Universal function for generating HTML via CLI, config, or module
 */
const generateAll = (options: Options, module = false): Promise<void | { pug: { [key: string]: string }, css: string | { [key: string]: string } }> => new Promise(async (resolve, reject) => {

	// * Stage 1/4: Check if files exist
	const checker = (file: string) => fs.pathExists(file).then((exists) => exists ? Promise.resolve()
		: Promise.reject(new PageryError(`File not found: ${file}`, 'Create this file or remove it from the configuration.')));

	// User data
	if (options.data != null) {

		// Ensure input is an array
		if (typeof options.data === 'string')
			options.data = [options.data];

		// Check if data files exist
		for (const data of options.data)
			try { await checker(data); }
			catch (err) { return reject(err); }
	}
	else log.debug('No data files specified');

	// Tailwind (.css and .config.js)
	// Ensure input is an array
	if (typeof options.tailwindFile === 'string')
		options.tailwindFile = [options.tailwindFile];

	// Check if Tailwind files exist
	for (const file of options.tailwindFile)
		try { await checker(file); }
		catch (err) { return reject(err); }

	// Check if Tailwind config file exists
	try { await checker(options.tailwindConfigFile); }
	catch (err) { return reject(err); }

	// Views directory (ensure at least one .pug file exists)
	try {
		const files = await fs.readdir(options.views);
		if (!files.some((file) => file.endsWith('.pug')))
			return reject(new PageryError(`No .pug files found in ${options.views}`, 'Create at least one .pug file in this directory.'));
	} catch (err) { return reject(err); }

	// Output directory (create if it doesn't exist)
	try {
		const exists = await fs.pathExists(options.output);
		if (!exists) {
			log.debug(`Creating output directory ${options.output}`);
			await fs.mkdir(options.output);
		}
	} catch (err) { return reject(err); }

	// Log how many files there are
	log.debug(`User data files: ${options.data ? options.data.length : 0}`);
	log.debug(`Tailwind CSS files: ${options.tailwindFile.length}`);

	// * Stage 2/4: Load data files

	let userData: any = {};

	// Set up loaders
	let dataLoaders: Promise<void>[] = [];
	if (options.data && options.data.constructor === Array)
		dataLoaders = options.data.map((file): Promise<void> => new Promise((resolve, reject) => {
			const filename = file.split('/').pop()?.split('.').shift() || null;
			return !filename
				? resolve(void 0)
				: fs.readJson(file)
					.then((json) => userData[filename] = json)
					.then(resolve)
					.catch(reject);
		}));

	// Load data files
	try {
		await Promise.all(dataLoaders);
	} catch (err) { return reject(err); }

	// * Stage 3/4: Compile the CSS
	let cssData: string | { [key: string]: string } = '';
	try {
		cssData = await css(options);
	} catch (err) { return reject(err); }

	// Set up for module export (aka not saving file)
	let pugData: { [key: string]: string } = {};

	// * Stage 4/4: Render the Pug files
	return fs.readdir(options.views)
		.then((files) => files.filter((file) => file.endsWith('.pug')).map((file) => file.replace('.pug', '')))
		.then((files) => Promise.all([
			log.debug(`Pug files: ${files.length}`),
			...files.map((file) => {

				// Check if file is excluded
				if (options.exclude && (options.exclude.toString() === file.concat('.pug') || Array.isArray(options.exclude) && options.exclude.find((exclude) => exclude === file.concat('.pug'))))
					return Promise.resolve();

				// Compile Pug file
				const pugFile = `${options.views}${file}.pug`;
				const htmlFile = `${options.output}${file}.html`;
				return fs.ensureFile(htmlFile)
					.then(() => pug.renderFile(pugFile, { css: cssData, data: userData }))
					.then((html) => {
						// ! TypeScript complains if this is ternary so leave as-is
						if (module) pugData[file] = html;
						else return fs.writeFile(htmlFile, html);
					})
					.then(() => log.info(`Generated ${htmlFile}`));
			})]))
		.then(() => log.success('Generated all files'))
		.then(() => resolve(module ? { pug: pugData, css: cssData } : void 0))
		.catch((err) => log.error(err));
});

// * Check if being run on the command line
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

	// Generic error printer
	const errorPrint = (err: any) => (console.log(err), log.error(err), process.exit(1));

	// * Config file operation
	if (args.config)
		readConfigFile(args.config).then((options) => generateAll(options)).catch(errorPrint);
	// * Command line operation
	else {
		// Merge default options with command line arguments
		const options: Options = {
			...DEFAULT_OPTIONS,
			...args,
		};

		// Change directory if specified
		if (options.dir) chdir(options.dir);

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

		// Run the generator
		generateAll(options).catch(errorPrint);
	}
}

/**
 * Generate as a module
 */
export const generate = (options: Options, logging = false) => {

	// Logging?
	log.setEnabled(logging);
	log.debug('Running as module');

	// Merge default options with user options
	const mergedOptions = {
		...DEFAULT_OPTIONS,
		...options
	};

	// Change dir
	if (options.dir) chdir(options.dir);

	return generateAll(mergedOptions, true);
};
