import { parseArgs } from '@std/cli/parse-args';

import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import { generate } from './generate.ts';
import { chdir, errorPrint, join, log } from './utils.ts';
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

		// Parse array types
		if (typeof opts.tailwindFile === 'string') {
			opts.tailwindFile = opts.tailwindFile.split(',');
		}
		if (typeof opts.postcssPlugins === 'string') {
			opts.postcssPlugins = opts.postcssPlugins.split(',');
		}
		if (typeof opts.data === 'string') {
			opts.data = opts.data.split(',');
		}
		if (typeof opts.exclude === 'string') {
			opts.exclude = opts.exclude.split(',');
		}
		if (typeof opts.only === 'string') {
			opts.only = opts.only.split(',');
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
