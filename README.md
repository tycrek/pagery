<div align="center">

# pagery

[![JSR badge]][JSR link]

*Opinionated static site generator*

</div>

[JSR badge]: https://jsr.io/badges/@tycrek/pagery
[JSR link]: https://jsr.io/@tycrek/pagery

## What is pagery?

pagery is my personal static site generator, primarily to be used with [Cloudflare Pages](https://pages.cloudflare.com/). Be aware: it is an extremely opinionated tool, using my really niche stack. I wrote this for myself but maybe someone else can see the benefits in the simplicity of my stack. Plus it's got some cool features.

**v8.0.0 now uses Deno 2.0!**

### The stack

| Tool | Use |
| :--: | :-: |
| [Pug](https://pugjs.org/) | HTML templating |
| [Tailwind CSS](https://tailwindcss.com/) | Page styling |
| [PostCSS](https://postcss.org/) | CSS processing |
| JSON | Structured data |

### Features

- Super-simple templating
- Compatible with Cloudflare Pages (or any other [JAMstack](https://www.cloudflare.com/en-ca/learning/performance/what-is-jamstack/) host)
- Iteratively generate pages from JSON
- Includes these PostCSS plugins:
   - [autoprefixer](https://github.com/postcss/autoprefixer#readme)
   - [cssnano](https://cssnano.github.io/cssnano/)
   - [postcss-font-magician](https://github.com/csstools/postcss-font-magician#readme)
   - [postcss-reporter](https://github.com/postcss/postcss-reporter#readme)

## Installation

Since version 8.0.0, pagery runs on [Deno 2.0](https://deno.com/blog/v2.0) rather than Node.js. Make sure you have Deno [installed](https://docs.deno.com/runtime/getting_started/installation/) before using pagery.

You can run pagery in your current directory without explicitly installing it:

```bash
deno run -A jsr:@tycrek/pagery
```

Or, you can install globally:

```bash
deno install -gAf jsr:@tycrek/pagery
```

## Usage

### Step 1: Setup Tailwind

Create two new files, `tailwind.config.ts` and `tailwind.css` in the root of your project. See [Tailwind CSS docs: Configuration](https://tailwindcss.com/docs/configuration#using-esm-or-type-script) for `tailwind.config.ts`.

Add the following to `tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

It is highly recommended to use [Tailwind `@layer`](https://tailwindcss.com/docs/adding-custom-styles#using-css-and-layer) directives to organize your CSS and avoid [specificity issues](https://www.w3schools.com/css/css_specificity.asp).

#### Multiple Tailwind configurations

As of Tailwind v3.2, you are able to use [multiple config files in one project](https://tailwindcss.com/blog/tailwindcss-v3-2#multiple-config-files-in-one-project-using-config). Reference Tailwinds documentation for more information.

### Step 2: Setup Pug

Create a `views` directory in the root of your project. This is where all of your Pug files will go. At least one `.pug` file is required for compilation to work.

#### Loading the CSS

You can use CSS by either referencing the static CSS files generated by Pagery, or if you opt to disable that, the inline `css` variable as follows within a Pug file:

```pug
style
    != css
```

This will include the compiled CSS in the `<style>` tag.

#### Multiple CSS files

See information below on passing multiple CSS files to Pagery. To use them in your Pug files, you would do the following:

```pug
style
    != css.main

//- or

style
    != css.admin
```

The item names correspond to the filenames of the CSS files.

#### Using Tailwind classes

Tailwind classes are available in the Pug files. For example, to create a button with a red background and white text, you would do the following:

```pug
button.bg-red-500.text-white(onclick='alert("Hello world!")') Click me!
```

Tailwind uses `:` by default to indicate modifiers. This is a problem in Pug, so it's recommended to do the following:

```ts
// tailwind.config.ts
import { Config } from 'tailwindcss';

export default {
    separator: '_',
    plugins: [],
    content: ['./views/**/*.pug'],
    theme: {
        extend: {
            //...
        }
    }
} satisfies Config;
```

```pug
button.bg-red_500.text-white.hover_bg-red-700(onclick='alert("Hello world!")') Click me!
```

See [Tailwind docs for Separator](https://tailwindcss.com/docs/configuration#separator) for more information.

For type completion in this file, make sure you have Tailwind installed:

```bash
deno install npm:tailwindcss
```

Some Tailwind classes use `/` for fractional values. This is also a problem in Pug, so it's recommended to do the following:

```pug
button.bg-red-500.text-white.hover_bg-red-700(class='w-1/2' onclick='alert("Hello world!")') Click me!
```

#### Using data

You can pass data to your Pug files by using the `--data` option. You can pass multiple files by separating them with a comma. For example:

```bash
pagery --data=foo.json,bar.json
```

The data will be available in the Pug files as the `data` variable. The data object is in the format of `data.[filename].[key]`. For example, if you have a `foo.json` file with the following contents:

```json
{
    "bar": "baz"
}
```

You can access it in your Pug files like this:

```pug
p= data.foo.bar
```

Your HTML would render as:

```html
<p>baz</p>
```

### Step 3: Run pagery

Once the project is setup, you can run pagery with the following command:

```bash
deno run -A jsr:@tycrek/pagery

# or, if installed globally:
pagery
```

This will compile your Pug files into HTML in the `html/` directory.

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `config` | Use a config file instead of CLI parameters | `null` |
| `views` | Directory where your Pug files are located | `views/` |
| `output` | Directory where the compiled HTML files will be placed | `html/` |
| `tailwindFile` | Path to your Tailwind CSS file(s) | `tailwind.css` |
| `tailwindConfigFile` | Path to your Tailwind config file | `tailwind.config.ts` |
| `outputCss` | Save compiled CSS to file | `true` |
| `postcssPlugins` | Comma-separated list of additional PostCSS pagery should load.\nMake sure to prefix packages with the correct repository (i.e. `npm:postcss-each`) | `[]` |
| `dir` | Directory to run pagery in | `./` |
| `data` | Path to JSON file(s) containing data to pass to Pug files | `null` |
| `exclude` | Comma-separated list of Pug files or directories to exclude from the output | `null` |
| `only` | Comma-separated list of Pug files to explicity render | `null` |
| `static` | Directory to recursively copy static files from | `null` |
| `` |

All options can be set on the command line (for example, `--output=website/`), in a JSON config file (must be referenced using `--config=file.json`), or when used as a module.

See [JSR docs](https://jsr.io/@tycrek/pagery/doc/~/Options) for more information.

**Example:**

```bash
pagery --views=pug/ --output=public/ --dir=website/
# or
pagery --dir=public/ --data=language.json --tailwindFile=css/main.css,css/admin.css
```

#### Using a config file

By specifying a config file with **`--config=filename.json`**, pagery will ignore all other command line options and instead use the values provided by the config file.

The config file supports all the same options as the command line, except for `--config` itself. For example:

```json
{
    "views": "pug/",
    "output": "public/",
    "dir": "website/",
    "data": "language.json",
    "tailwindFile": "css/main.css,css/admin.css"
}
```

This would be the same as running:

```bash
pagery --views=pug/ --output=public/ --dir=website/ --data=language.json --tailwindFile=css/main.css,css/admin.css
```

#### Importing as a module (*out-of-date*)

You can also import pagery as a module and use it in your own scripts for dynamic server-side rendering. For example:

```ts
import pagery from 'pagery';

/* this is out of date and will be updated soon */

//generate({
//    views: 'pug/',
//    output: 'public/',
//    dir: 'website/',
//    data: 'language.json',
//    tailwindFile: 'css/main.css,css/admin.css'
//})
//    .then((data) => {
//        console.log(`HTML files: ${Object.keys(data.pug).length}`);
//        console.log(`CSS files: ${data.css instanceof Array ? data.css.length : 1}`);
//    })
//    .catch((err) => console.error(err));
```

#### Iteration Generation

You can use an **Iteration** file to quickly build many pages from a single template and JSON data.

An Iteration file is indicated to pagery using `[].pug`. For example, `[recipes].pug` would generate multiple pages using data contained in the `recipes.json` file. You **must** also specify any iteration data files with the `data` option (i.e. `--data=recipes.json`).

By default, pagery will use the `"data"` property in the JSON file. If you have multiple top-level properties or want to use something other than `"data"`, you may specify so using commas. For example, using `[recipes,breakfast].pug` would use the `recipes.json` data file, but generating with data from the `"breakfast"` property. You may also use nested properties, such as `[recipes,breakfast,drinks].pug`. A sample `recipes.json` may look like this:

```jsonc
{
    "breakfast": {
        "drinks": {
            "hot-chocolate": {
                ...
            },
            "chai-latte": {
                ...
            }
        },
        "eggs": {
            "fried": {
                ...
            }
        }
    },
    "lunch": {
        ...
    }
}
```

The data provided to an Iteration must be in Object form: the Object key becomes the filename and the value is passed to the template for that specific step of the Iteration. In the last example, `hot-chocolate.html` and `chai-latte.html` would be generated by the Iteration file.

## License

Licensed under [ISC](https://github.com/tycrek/pagery/blob/master/LICENSE)

Copyright (c) 2023-2024 [tycrek](https://github.com/tycrek)
