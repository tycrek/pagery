import { parseArgs } from '@std/cli/parse-args';

import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import { generate } from './generate.ts';
import { arrayify, chdir, errorPrint, join, log } from './utils.ts';
import type { Options } from './Options.ts';

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

	generate(processArgs(args.config ? processFileDefaults(join(args.config)) : args))
		.then(() => log.success('Complete'))
		.catch(errorPrint);
} else {
	log.error('Module not yet implemented, please use CLI');
	Deno.exit(1);
}
