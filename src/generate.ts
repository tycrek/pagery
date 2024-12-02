// import pug from 'pug';
// import postcss from 'postcss';
// import * as tailwindcss from 'tailwindcss';
// import * as autoprefixer from 'autoprefixer';
// import * as cssnano from 'cssnano';
// import fontMagic from 'postcss-font-magician';

import { log } from './utils.ts';
import { PageryError } from './PageryError.ts';
import type { Options } from './Options.ts';

export const generateAll = (options: Options) => {
	log.info(options.output ?? '<default>');
};
