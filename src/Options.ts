export interface Options {
	// Pug views directory
	views: string;

	// Output directory
	output: string;

	// Tailwind CSS file. Can be a string or an array of strings.
	tailwindFile: string | string[];

	// Tailwind config file
	tailwindConfigFile: string;

	// Output compiled CSS as files
	outputCss: boolean;

	// PostCSS plugins. Can be a string or an array of strings.
	postcssPlugins: string | string[];

	// Directory to run in
	dir?: string;

	// Data files to pass to Pug. Can be a string or an array of strings of JSON files.
	data?: string | string[];

	// Files to exclude from rendering. Can be a string or an array of strings.
	exclude?: string | string[];

	// Only render these specific files. Can be a string or an array of strings.
	only?: string | string[];

	config?: string;
}

export const DEFAULT_OPTIONS: Options = {
	views: 'views/',
	output: 'html/',
	tailwindFile: 'tailwind.css',
	tailwindConfigFile: 'tailwind.config.js',
	outputCss: true,
	postcssPlugins: [],
};

const defaultsAsRecord: Record<string, string | number> = Object.entries(
	DEFAULT_OPTIONS,
).reduce((acc, [key, value]) => {
	acc[key] = value;
	return acc;
}, {} as Record<string, string | number>);
export const DEFAULT_OPTIONS_RECORD = defaultsAsRecord;
