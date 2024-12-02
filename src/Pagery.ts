import pkg from '../deno.json' with { type: 'json' };

import * as path from '@std/path';
import { parseArgs } from '@std/cli/parse-args';

import Log from './Log.ts';
import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import { generateAll } from './generate.ts';
import type { Options } from './Options.ts';

export const log = new Log(`${pkg.name.split('/')[1]} v${pkg.version} |`);
export const join = (...args: string[]) => path.join(Deno.cwd(), ...args);

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
		if (opts.dir) Deno.chdir(opts.dir);

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

	generateAll(processArgs(args.config ? processFileDefaults(join(args.config)) : args));
} else {
	log.error('Module not yet implemented, please use CLI');
	Deno.exit(1);
}
