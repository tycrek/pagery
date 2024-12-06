import { parseArgs } from '@std/cli/parse-args';

import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import { generate, generateCss as genCss, generatePug as genPug } from './generate.ts';
import { arrayify, chdir, errorPrint, join, log } from './utils.ts';
import type { Options } from './Options.ts';

const processArgs = (opts: Options): Options => {
	// Change directory if needed
	if (opts.dir) chdir(opts.dir);

	// Use absolute paths
	opts.views = join(opts.views);
	opts.output = join(opts.output);

	// Types that should be an array
	const arrayFields: ('tailwindFile' | 'postcssPlugins' | 'data' | 'exclude' | 'only')[] = [
		'tailwindFile',
		'postcssPlugins',
		'data',
		'exclude',
		'only',
	];

	// Parse array types
	for (const field of arrayFields) {
		if (opts[field] == '' || opts[field] == null) continue;
		if (typeof opts[field] === 'string') {
			opts[field] = arrayify(opts[field].split(','));
		}
	}

	return opts;
};

// * Check if running via CLI
if (import.meta.main) {
	// Parse command line arguments
	const args = parseArgs(Deno.args, {
		default: DEFAULT_OPTIONS_RECORD,
		boolean: ['outputCss'],
	}) as unknown as Options;

	const processFileDefaults = (conf: string) => {
		return {
			...DEFAULT_OPTIONS,
			...JSON.parse(Deno.readTextFileSync(conf)),
		};
	};

	generate(processArgs(args.config ? processFileDefaults(join(args.config)) : args))
		.then(() => log.success('Complete'))
		.catch(errorPrint);
}

/**
 * Default generator: produces both Pug and CSS.
 * @param options - Pagery options
 * @returns Promise resolving compiled Pug and CSS
 */
export default (options: Options): Promise<{
	pug: { [key: string]: string };
	css: { [key: string]: string };
}> => generate(processArgs(options));

/**
 * CSS generator
 * @param options - Pagery options
 * @returns Promise resolving compiled CSS
 */
export const generateCss = (options: Options): Promise<
	{ [key: string]: string }
> => genCss(processArgs(options));

/**
 * Pug generator
 * @param options - Pagery options
 * @param userData - JSON data to pass to Pug renderer
 * @param cssData - CSS data to pass to Pug renderer
 * @returns Promise resolving compilged Pug
 */
export const generatePug = (
	options: Options,
	userData: { [key: string]: JSON },
	cssData: { [key: string]: string },
): Promise<
	{ [key: string]: string }
> => genPug(processArgs(options), userData, cssData);
