import { parseArgs } from '@std/cli/parse-args';
import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import { generate, generateCss, generatePug } from './generate.ts';
import { arrayify, chdir, errorPrint, join, log } from './utils.ts';
import type { Options } from './Options.ts';

/**
 * Pagery generators
 */
export default class Pagery {
	readonly options: Options;
	private isModule = !import.meta.main;
	private originalDir = Deno.cwd();

	constructor(options: Options) {
		this.options = this.processArgs(options);
	}

	private processArgs = (opts: Options): Options => {
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

	/**
	 * Default generator: produces both Pug and CSS.
	 * @returns Promise resolving compiled Pug and CSS
	 */
	async generate(): Promise<{ pug: { [key: string]: string }; css: { [key: string]: string } }> {
		const results = await generate(this.options, this.isModule);
		Deno.chdir(this.originalDir);
		return Promise.resolve(results);
	}

	/**
	 * CSS generator
	 * @returns Promise resolving compiled CSS
	 */
	async css(): Promise<{ [key: string]: string }> {
		const results = await generateCss(this.options);
		Deno.chdir(this.originalDir);
		return Promise.resolve(results);
	}

	/**
	 * Pug generator
	 * @param cssData - CSS data to pass to Pug renderer
	 * @param userData - JSON data to pass to Pug renderer
	 * @returns Promise resolving compiled Pug
	 */
	async pug(
		cssData: { [key: string]: string },
		userData: { [key: string]: JSON } = {},
	): Promise<{ [key: string]: string }> {
		const results = await generatePug(this.options, userData, cssData);
		Deno.chdir(this.originalDir);
		return Promise.resolve(results);
	}
}

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

	try {
		await new Pagery(args.config ? processFileDefaults(join(args.config)) : args).generate();
		log.success('Complete');
	} catch (err) {
		errorPrint(err);
	}
}

export type { Options };
