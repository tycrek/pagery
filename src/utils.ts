import pkg from '../deno.json' with { type: 'json' };
import * as path from '@std/path';
import Log from './Log.ts';
import { PageryError } from './PageryError.ts';

/**
 * Logger
 */
export const log = new Log(`${pkg.name.split('/')[1]} v${pkg.version} |`);

/**
 * Generic error printer
 */
// deno-lint-ignore no-explicit-any
export const errorPrint = (err: any) => (console.log(err), log.error(err), Deno.exit(1));

/**
 * Quick function to change directory & log it
 */
export const chdir = (dir: string) => {
	Deno.chdir(dir);
	log.debug(`Changed directory to ${dir}`);
};

/**
 * Path joiner
 */
export const join = (...args: string[]) => path.join(Deno.cwd(), ...args);

/**
 * Quick function to convert a regular string to a single-element array
 */
export const arrayify = (input: string | string[]) => (typeof input === 'string') ? [input] : input;

export const Errors = {
	FileNotFound: (file: string) =>
		new PageryError(`File not found: ${file}`, 'Create this file or remove it from the configuration.'),
	NoPugFiles: (dir: string) =>
		new PageryError(`No .pug files found in ${dir}`, 'Create at least one .pug file in this directory.'),
};
