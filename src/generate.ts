import { ensureDir, ensureFile, exists } from '@std/fs';

import pug from 'pug';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import fontMagic from 'postcss-font-magician';
import reporter from 'postcss-reporter';

import { arrayify, log } from './utils.ts';
import type { Options } from './Options.ts';
import { Errors } from './utils.ts';

/**
 * CSS generator
 */
const generateCss = async (options: Options): Promise<{ [key: string]: string }> => {
	// Load included plugins
	const plugins = [
		tailwindcss({ config: options.tailwindConfigFile }),
		autoprefixer(),
		cssnano({ preset: 'default' }),
		fontMagic({ protocol: 'https:' }),
	];

	// User-defined plugins
	if (Array.isArray(options.postcssPlugins)) {
		for (const plugin of options.postcssPlugins) {
			// Dynamically import the plugin
			const importedModule = await import(plugin);

			// If the module is a PostCSS function, load it
			if (importedModule.default.postcss && typeof importedModule.default === 'function') {
				plugins.push(importedModule.default());
				log.debug(`[PostCSS] ${plugin}: success`);
			} else log.warn(`[PostCSS] ${plugin}: failed`);
		}
	}

	// Append postcss-reporter to plugins list (must be last)
	plugins.push(reporter());

	// PostCSS compiler
	const compileCss = async (filepath: string) => {
		// Process input file
		const results = await postcss(plugins).process(await Deno.readTextFile(filepath), {
			from: filepath,
			to: filepath,
		});

		// Check warnings
		let warned = false;
		for (const warn of results.warnings()) {
			log.warn(`[PostCSS] ${warn.toString()}`);
			warned = true;
		}
		if (warned) await new Promise((r) => setTimeout(r, 3E3));

		return results.toString();
	};

	// Compile all CSS files
	const css: { [key: string]: string } = {};
	for (const file of options.tailwindFile) {
		const data = await compileCss(file);
		const key = file.match(/^(.*)(?=\.)/g)![0];
		css[key] = data;
		log.info(`[CSS] ${key}: ${data.length} bytes`);
	}

	return Promise.resolve(css);
};

const generatePug = async (
	options: Options,
	userData: { [key: string]: JSON },
	cssData: { [key: string]: string },
): Promise<{ [key: string]: string }> => {
	// Iteration structure
	interface IterationFile {
		source: string;
		iterData: JSON;
	}

	// Iteration Data
	const Iterations: { list: IterationFile[]; build: (file: Deno.DirEntry, root: string) => IterationFile } = {
		list: [],
		build: (file, root) => {
			// Get iteration name
			const iterationName = file.name.replaceAll(/[\[\]]|\.pug/g, '');

			// Build an Iteration
			return ({
				source: `${root}/${file.name}`,
				iterData: iterationName.includes(',')
					? (() => {
						const split = iterationName.split(','); // Get the data key (first element) and optional property keys
						const prop = split.slice(1); // Get property keys, if any

						// Get nested property data from a key such as [file,one,two]
						let d = userData[split[0]];
						for (const p of prop) {
							// @ts-ignore:7053
							d = d[p.replaceAll(/[\[\]]/g, '')];
						}
						return d;
					})()
					: userData[iterationName], // If no property keys, just the data key
			});
		},
	};

	// Recusively get all Pug files in the provided directory
	const dogWalk = async (root: string, sub = false): Promise<string[]> => {
		const isPug = (file: Deno.DirEntry) => file.isFile && file.name.endsWith('.pug');

		const dir = Deno.readDirSync(root);
		const files = Array.from(dir);

		// Set up iterator
		const pugFiles: string[] = [];
		for (
			const file of files
				.filter((file) => !options.exclude?.includes(file.name))
				.filter((file) => (options.only?.length ?? 0) > 0 ? options.only?.includes(file.name) : true)
		) {
			// Directories should be recursively checked
			if (file.isDirectory) {
				pugFiles.push(...(await dogWalk(`${root}/${file.name}`, true)));
			} // Otherwise get a list of Pug files
			else if (isPug(file) && !file.name.includes('[')) {
				pugFiles.push(`${sub ? root.replace(options.views, '') : ''}/${file.name.replace('.pug', '')}`);
			} // Or build an Iteration
			else if (isPug(file) && file.name.includes('[') && file.name.includes(']')) {
				Iterations.list.push(Iterations.build(file, root));
			}
		}
		return Promise.resolve(pugFiles);
	};

	// Generate list of files to render (also populates Iterations.list)
	const files = await dogWalk(options.views);

	// Pug renderer
	const pugData: { [key: string]: string } = {};
	const render = async (file: string, pugFile: string, data = userData) => {
		pugData[file] = await pug.renderFile(pugFile, { css: cssData, data });
		log.info(`[PUG] ${file}`);
	};

	// Process regular Pug files
	await Promise.all(files.map((file) => render(file, `${options.views}${file}.pug`)));

	// Process Iterations
	const iterations: Promise<void>[] = [];
	for (const iter of Iterations.list) {
		Object.entries(iter.iterData).forEach(([key, entry]) => {
			const file = `${iter.source.replace(options.views, '').replace(/\[(.*)\]\.pug/, key)}`;
			// todo: merge userData with entry (data)
			iterations.push(render(file, iter.source, entry));
		});
	}
	await Promise.all(iterations);

	return Promise.resolve(pugData);
};

export const generate = async (options: Options, module = false): Promise<void> => {
	/*
	 * 1/4: Files check
	 */
	// Check: output directory
	await ensureDir(options.output);

	// Check: user data
	if (options.data != null) {
		options.data = arrayify(options.data);
		for (const file of options.data) {
			if (!await exists(file)) {
				throw Errors.FileNotFound(file);
			}
		}
	} else log.debug('[DATA] No files specified');

	// Check: Tailwind.css
	options.tailwindFile = arrayify(options.tailwindFile);
	for (const file of options.tailwindFile) {
		if (!await exists(file)) {
			throw Errors.FileNotFound(file);
		}
	}

	// Check: Tailwind.config.ts
	if (!await exists(options.tailwindConfigFile)) {
		throw Errors.FileNotFound(options.tailwindConfigFile);
	}

	// Check: views/ directory (at least one .pug file)
	let checkHasPug = false;
	{
		for await (const entry of Deno.readDir(options.views)) {
			if (entry.isFile && entry.name.endsWith('.pug')) {
				checkHasPug = true;
				break;
			}
		}

		if (!checkHasPug) {
			throw Errors.NoPugFiles(options.views);
		}
	}

	/*
	 * 2/4: Load data files
	 */
	const userData: { [key: string]: JSON } = {};
	if (options.data && Array.isArray(options.data)) {
		for (const file of options.data) {
			const filename = file.split('/').pop()!.split('.').shift()!;
			userData[filename] = JSON.parse(await Deno.readTextFile(file));
		}
	}

	/*
	 * 3/4: Compile CSS
	 */
	const cssData = await generateCss(options);
	if (options.outputCss) {
		await ensureDir(`${options.output}/css/`);
		for (const [filename, contents] of Object.entries(cssData)) {
			await Deno.writeTextFile(`${options.output}/css/${filename}.css`, contents as string);
		}
	}

	/*
	 * 4/4: Render Pug
	 */
	const pugData = await generatePug(options, userData, cssData);
	for (const [filename, contents] of Object.entries(pugData)) {
		const htmlFile = `${options.output}${filename}.html`;
		await ensureFile(htmlFile);
		await Deno.writeTextFile(htmlFile, contents);
	}

	return Promise.resolve(void 0);
};
