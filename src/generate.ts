import { ensureDir, exists } from '@std/fs';

// import pug from 'pug';
// import postcss from 'postcss';
// import * as tailwindcss from 'tailwindcss';
// import * as autoprefixer from 'autoprefixer';
// import * as cssnano from 'cssnano';
// import fontMagic from 'postcss-font-magician';

import { arrayify, log } from './utils.ts';
import type { Options } from './Options.ts';
import { Errors } from './utils.ts';

const compileCss = (): Promise<{ [key: string]: string }> =>
	new Promise((resolve, _rejct) => {
		return resolve({});
	});

export const generate = async (options: Options, module = false): Promise<void> => {
	const pugData: { [key: string]: string } = {};

	// * 1/4: Files check

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
	} else log.debug('No data files specified');

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

	// Log number of files
	log.debug(`User data files: ${options.data ? options.data.length : 0}`);
	log.debug(`Tailwind CSS files: ${options.tailwindFile.length}`);

	// * 2/4: Load data files

	// deno-lint-ignore no-explicit-any
	const userData: any = {};

	if (options.data && options.data.constructor === Array) {
		options.data.map((file) => {
			const filename = file.split('/').pop()!.split('.').shift()!;
			userData[filename] = JSON.parse(Deno.readTextFileSync(file));
		});
	}

	// * 3/4: Compile CSS

	const cssData = await compileCss();
	if (options.outputCss) {
		await ensureDir(`${options.output}/css/`);
		for (const [filename, contents] of Object.entries(cssData)) {
			await Deno.writeTextFile(`${options.output}/css/${filename}.css`, contents as string);
		}
	}

	// * 4/4: Render Pug

	return Promise.resolve(void 0);
};
