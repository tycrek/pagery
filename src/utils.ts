import pkg from '../deno.json' with { type: 'json' };
import * as path from '@std/path';
import Log from './Log.ts';

/**
 * Logger
 */
export const log = new Log(`${pkg.name.split('/')[1]} v${pkg.version} |`);

/**
 * Path joiner
 */
export const join = (...args: string[]) => path.join(Deno.cwd(), ...args);

/**
 * Quick function to convert a regular string to a single-element array
 */
export const arrayify = (input: string | string[]) => (typeof input === 'string') ? [input] : input;
