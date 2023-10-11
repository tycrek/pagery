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
	outputCss: true,
	postcssPlugins: [],
};

/**
 * Generic error printer
 */
const errorPrint = (err: any) => (console.log(err), log.error(err), process.exit(1));

/**
 * Fixes slashes in strings
 */
const fixSlashes = (str: string) => str.concat(str.includes('/') ? '/' : '\\').replaceAll('//', '/').replaceAll('\\\\', '\\');

/**
 * Checks if the provided file is a .pug file
 */
const isPugFile = (f: fs.Dirent) => f.isFile() && f.name.endsWith('.pug');

/**
 * Promise-focused file existance checker
 */
const doesFileExist = (file: string) => fs.pathExists(file).then((exists) => exists ? Promise.resolve()
	: Promise.reject(new PageryError(`File not found: ${file}`, 'Create this file or remove it from the configuration.')));

/**
 * Writes provided CSS data to a file
 */
const writeCssFile = (out: string, fn: string, c: string) => fs.writeFileSync(`${out}css/${fn}.css`, c);

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

	// Set up for module export (aka not saving file)
	let pugData: { [key: string]: string } = {};
	try {

		// * Stage 1/4: Check if files exist

		// User data
		if (options.data != null) {

			// Ensure input is an array
			if (typeof options.data === 'string')
				options.data = [options.data];

			// Check if data files exist
			for (const data of options.data)
				await doesFileExist(data);
		}
		else log.debug('No data files specified');

		// Tailwind (.css and .config.js)
		// Ensure input is an array
		if (typeof options.tailwindFile === 'string')
			options.tailwindFile = [options.tailwindFile];

		// Check if Tailwind files exist
		for (const file of options.tailwindFile)
			await doesFileExist(file);

		// Check if Tailwind config file exists
		await doesFileExist(options.tailwindConfigFile);

		// Views directory (ensure at least one .pug file exists)
		if (!(await fs.readdir(options.views)).some((file) => file.endsWith('.pug')))
			return reject(new PageryError(`No .pug files found in ${options.views}`, 'Create at least one .pug file in this directory.'));

		// Output directory (create if it doesn't exist)
		if (!(await fs.pathExists(options.output))) {
			log.debug(`Creating output directory ${options.output}`);
			await fs.mkdir(options.output);
		}

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
		await Promise.all(dataLoaders);

		// * Stage 3/4: Compile the CSS

		let cssData: string | { [key: string]: string } = '';

		cssData = await css(options);


		if (options.outputCss) {
			// Ensure the directory exists
			fs.ensureDir(`${options.output}/css/`);

			// Save CSS files
			if (typeof cssData === 'string')
				writeCssFile(options.output, 'pagery', cssData);
			else for (let [filename, contents] of Object.entries(cssData))
				writeCssFile(options.output, filename, contents);
		}

		// * Stage 4/4: Render the Pug files

		// Iteration structure
		interface IterationFile {
			source: string;
			iterData: any;
		};

		// Iteration data
		const Iterations: { list: IterationFile[], build: (file: fs.Dirent, root: string) => IterationFile } = {
			list: [],
			build: (file, root) => {

				// Get the name of the iteration
				const iterationName = file.name.replaceAll(/[\[\]]|\.pug/g, '');

				// Build an Iteration
				return ({
					source: `${root}/${file.name}`,
					iterData: iterationName.includes(',') ? (() => {
						const split = iterationName.split(','); // Get the data key (first element) and optional property keys
						const prop = split.slice(1); // Get property keys, if any

						// Get nested property data from a key such as [file,one,two]
						let d = userData[split[0]];
						for (let p of prop)
							d = d[p.replaceAll(/[\[\]]/g, '')];
						return d;
					})() : userData[iterationName] // If no property keys, just the data key
				});
			}
		};

		// Recursively gets all Pug files in the provided directory (and subdirectories)
		const pugTree = (root: string, sub = false): Promise<string[]> => new Promise((resolve, reject) =>
			fs.readdir(root, { withFileTypes: true })
				.then(async (files) => {

					// Set up iterator
					const pugFiles: string[] = [];
					for (let file of files
						.filter((file) => !options.exclude?.includes(file.name))
						.filter((file) => (options.only?.length ?? 0) > 0 ? options.only?.includes(file.name) : true))

						// Directories should be recursively checked
						if (file.isDirectory())
							pugFiles.push(...(await pugTree(`${root}/${file.name}`, true)));

						// Otherwise get a list of Pug files
						else if (isPugFile(file) && !file.name.includes('['))
							pugFiles.push(`${sub ? root.replace(options.views, '') : ''}/${file.name.replace('.pug', '')}`);

						// Or build an Iteration
						else if (isPugFile(file) && file.name.includes('[') && file.name.includes(']'))
							Iterations.list.push(Iterations.build(file, root));

					return pugFiles;
				})
				.then(resolve)
				.catch(reject));

		// Generate list of Pug files to render
		const files = await pugTree(options.views);

		// Log file list details for user
		log.debug(`Pug files: ${files.length}`);
		Iterations.list.length > 0 && log.debug(`Iterations: ${Iterations.list.length}`);

		// Quick function for rendering Pug files
		const render = (file: string, pugFile: string, htmlFile: string, data = userData) =>
			fs.ensureFile(htmlFile)
				.then(() => pug.renderFile(pugFile, { css: cssData, data }))
				.then((html) => {
					// ! TypeScript complains if this is ternary so leave as-is
					if (module) pugData[file] = html;
					else return fs.writeFile(htmlFile, html);
				})
				.then(() => log.info(`Generated ${htmlFile}`));

		// Process Pug files
		Promise.all(files.map((file) => render(file, `${options.views}${file}.pug`, `${options.output}${file}.html`)))

			// Process iterations
			.then(() => {
				const iterations: Promise<void>[] = [];

				// Go through each Iteration template file
				Iterations.list.forEach(({ source, iterData }) =>

					// Go through all the entries for the given Iteration
					Object.entries(iterData).forEach(([key, data]) => {
						const file = `${source.replace(options.views, '').replace(/\[(.*)\]\.pug/, key)}`;
						iterations.push(render(file, source, `${options.output}${file}.html`, data));
					}));

				return Promise.all(iterations);
			})

			.then(() => log.success('Generated all files'))
			.then(() => resolve(module ? { pug: pugData, css: cssData } : void 0))
			.catch((err) => log.error(err));
	} catch (err) { return reject(err); }
});

// * Check if being run on the command line
if (require.main === module) {

	/*
	 * Parse command line arguments
	 *
	 * --config=config.json
	 * --views=views/               # Pug main file
	 * --output=html/               # Output directory
	 * --tailwindFile=tailwind.css  # Tailwind CSS file
	 * --tailwindConfigFile=tailwind.config.js  # Tailwind config file
	 * --outputCss=true             # Saves compiled CSS to file
	 * --dir=./                     # Run in this directory
	 * --data=data.json             # Data file(s) to pass to Pug
	 * --exclude=views/_head.pug    # File(s) to exclude from rendering
	 * --only=views/spec.pug        # File(s) to explicity render (nothing else)
	 */
	const args = process.argv.slice(2).reduce((acc, arg) => {
		const [key, value] = arg.split('=');
		acc[key.replaceAll('--', '')] = value;
		return acc;
	}, {} as Record<string, string>);

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
		options.views = fixSlashes(path(options.views));
		options.output = fixSlashes(path(options.output));

		// Fix outputCss boolean
		if (options.outputCss) options.outputCss = JSON.parse(options.outputCss as any as string);

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

		// Convert only files to an array
		if (typeof options.only === 'string')
			options.only = options.only.split(',');

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
