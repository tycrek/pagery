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
}

export interface ConfigFile {
	views?: string;
	output?: string;
	outputCss?: boolean;
	tailwindFile?: string | string[];
	tailwindConfigFile?: string;
	postcssPlugins?: string | string[];
	dir?: string;
	data?: string | string[];
	exclude?: string | string[];
	only?: string | string[];
}
