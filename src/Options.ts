/**
 * Pagery configuration
 */
export interface Options {
	/**
	 * Directory storing Pug source files
	 */

	views: string;

	/**
	 * Directory to output compiled files to
	 */

	output: string;

	/**
	 * List of CSS source files
	 */

	tailwindFile: string | string[];

	/**
	 * Tailwind config file
	 */

	tailwindConfigFile: string;

	/**
	 * Output compiled CSS as files
	 */

	outputCss: boolean;

	/**
	 * List of additional PostCSS plugins to load
	 */

	postcssPlugins: string | string[];

	/**
	 * Directory to run Pagery in
	 */

	dir?: string;

	/**
	 * List of JSON data files to pass to Pug
	 */

	data?: string | string[];

	/**
	 * List of files to exclude from rendering. Files don't have to be an exact path
	 */

	exclude?: string | string[];

	/**
	 * List of files to render. Anything not in this list will be skipped
	 */
	only?: string | string[];

	/**
	 * Directory to recursively copy static files from.
	 * Files at the root of this directory will land in the root of the output directory.
	 */
	static?: string;

	config?: string;
}

export const DEFAULT_OPTIONS: Options = {
	views: 'views/',
	output: 'html/',
	tailwindFile: 'tailwind.css',
	tailwindConfigFile: 'tailwind.config.ts',
	outputCss: true,
	postcssPlugins: [],
};

export const DEFAULT_OPTIONS_RECORD: Record<string, string | number> = Object.entries(DEFAULT_OPTIONS)
	.reduce((acc, [key, value]) => {
		acc[key] = value;
		return acc;
	}, {} as Record<string, string | number>);
