import pkg from '../deno.json' with { type: 'json' };

import * as path from '@std/path';
import { parseArgs } from '@std/cli/parse-args';

import pug from 'pug';
import postcss from 'postcss';
import * as tailwindcss from 'tailwindcss';
import * as autoprefixer from 'autoprefixer';
import * as cssnano from 'cssnano';
import fontMagic from 'postcss-font-magician';

import Log from './Log.ts';
import { PageryError } from './PageryError.ts';
import { DEFAULT_OPTIONS, DEFAULT_OPTIONS_RECORD } from './Options.ts';
import type { ConfigFile, Options } from './Options.ts';

const log = new Log(`${pkg.name.split('/')[1]} v${pkg.version} |`);
const join = (...args: string[]) => path.join(Deno.cwd(), ...args);

if (import.meta.main) {
	const args: Options = parseArgs(Deno.args, {
		default: DEFAULT_OPTIONS_RECORD,
	});
	console.log(args.dir);
} else {
	log.error('Module not yet implemented, please use CLI');
	Deno.exit(1);
}
