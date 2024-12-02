import pkg from '../deno.json' with { type: 'json' };

import * as path from '@std/path';

import postcss from 'postcss';
import pug from 'pug';

import Log from './Log.ts';
import { PageryError } from './PageryError.ts';
import { DEFAULT_OPTIONS } from './Options.ts';
import type { ConfigFile, Options } from './Options.ts';

const log = new Log(`${pkg.name.split('/')[1]} v${pkg.version} |`);
const join = (...args: string[]) => path.join(Deno.cwd(), ...args);
