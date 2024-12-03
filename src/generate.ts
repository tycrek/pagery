import { ensureDir, exists } from '@std/fs';

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

const generatePug = async (options: Options): Promise<void> => {
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
			log.debug(`[DATA] ${filename}: ${JSON.stringify(userData[filename]).length} bytes`);
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
	const pugData: { [key: string]: string } = {};
	log.warn('[PUG] WIP: not yet implemented');

	return Promise.resolve(void 0);
};
