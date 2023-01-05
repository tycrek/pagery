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

# readme is a work in progress

required things:

User must provide a tailwind.config.css in their project root.

User must include the following in the Pug main file:

```pug
style
    != css
```

User must include a Tailwind CSS file, including the following as the bare minimum:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Command line options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| 

- tailwind.config.js
- tailwind.css
- views/
- font awesome kit ID *or* selection of free icon kit (like remix, etc)
