[//]: # (NPM centered badge template START --------------------------------------------------)

<div align="center">

pagery
===

[![NPMCBT badge]][NPMCBT link]

*Static site generator*

</div>

[NPMCBT badge]: https://img.shields.io/npm/v/pagery?color=CB3837&label=%20View%20on%20NPM&logo=npm&style=for-the-badge
[NPMCBT link]: https://www.npmjs.com/package/pagery

[//]: # (NPM centered badge template END ----------------------------------------------------)

## What is pagery?

pagery is my personal static site generator, primarily to be used with [Cloudflare Pages](https://pages.cloudflare.com/). **Beware:** it is an extremely opinionated tool, using my really niche stack. I wrote this for myself but maybe someone else can see the benefits in the simplicity of my stack.

### The stack

| Tool | Use |
| :--: | :-: |
| [Pug](https://pugjs.org/) | HTML templating |
| [Tailwind CSS](https://tailwindcss.com/) | styling |
| [PostCSS](https://postcss.org/) | CSS processing |

### Features

- Super-simple templating
- Compatible with Cloudflare Pages
- Included PostCSS plugins:
   - [autoprefixer](https://npmjs.com/package/autoprefixer)
   - [cssnano](https://cssnano.co/)
   - [postcss-font-magician](https://npmjs.com/package/postcss-font-magician)

## Installation

```bash
npm i -g pagery

# or, per project
npm i pagery
```

Global installation is recommened. If you install per project, I suggest including this script in your `package.json`:

```json
{
    "scripts": {
        "pagery": "node ./node_modules/pagery/dist/pagery.js"
    },
    // ...
}
```

Then run it with `npm run pagery`.

It is recommended to be using at least Node 16 and NPM 8.

## Project setup

### Step 1: Setup Tailwind

Create two new files, `tailwind.config.js` and `tailwind.css` in the root of your project. See [Tailwind CSS docs: Configuration](https://tailwindcss.com/docs/configuration) for `tailwind.config.js`

Add the following to `tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

It is highly recommended to use [Tailwind `@layer`](https://tailwindcss.com/docs/adding-custom-styles#using-css-and-layer) directives to organize your CSS and avoid [specificity issues](https://www.w3schools.com/css/css_specificity.asp).

### Step 2: Setup Pug

Create a `views` directory in the root of your project. This is where all of your Pug files will go. An `index.pug` file is required to generate the `index.html` file which most hosting providers will use as the default page.

#### Loading the CSS

Right now, pagery doesn't generate a separate CSS file. Instead, you'll have to include the following anywhere in your Pug pages:

```pug
style
    != css
```

This will include the compiled CSS in the `<style>` tag.

#### Using Tailwind classes

Tailwind classes are available in the Pug files. For example, to create a button with a red background and white text, you would do the following:

```pug
button.bg-red-500.text-white(onclick='alert("Hello world!")') Click me!
```

Tailwind uses `:` by default to indicate modifiers. This is a problem in Pug, so it's recommended to do the following:

```js
// tailwind.config.js
module.exports = {
    separator: '_',
    // ...
}
```

```pug
button.bg-red_500.text-white.hover_bg-red-700(onclick='alert("Hello world!")') Click me!
```

See [Tailwind docs for Separator](https://tailwindcss.com/docs/configuration#separator) for more information.

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
pagery
```

This will compile your Pug files into HTML in the `html/` directory.

#### Command line options

| Option | Description | Default |
|--------|-------------|---------|
| `--views` | Directory where your Pug files are located | `views/` |
| `--output` | Directory where the compiled HTML files will be placed | `html/` |
| `--tailwindFile` | Path to your Tailwind CSS file | `tailwind.css` |
| `--tailwindConfigFile` | Path to your Tailwind config file | `tailwind.config.js` |
| `--dir` | Directory to run pagery in | `./` |
| `--data` | Path to JSON file(s) containing data to pass to Pug files | `null` |

**Example:**

```bash
pagery --views=pug/ --output=public/ --dir=website/
```
