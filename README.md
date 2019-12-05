# `tsc-silent`

The purpose of the wrapper is to execute TypeScript compiler but suppress some error messages
coming from certain files/folders. For example, this can be used to enable `noImplicitAny` in
some parts of the project while keeping it disabled in others.

## Installing

```bash
npm install -g tsc-silent
```

## Usage

```
tsc-silent --project <path> [--suppress config | --suppressConfig path] [--compiler path] [--watch]
```

## Synopsis

```
--project, -p    Path to tsconfig.json

--compiler       Path to typescript.js.
                 By default, uses `./node_modules/typescript/lib/typescript.js`.

--suppress       Suppressed erros.
                 E.g. `--suppress 7017@src/js/ 2322,2339,2344@/src/legacy/`.

--suppressConfig Path to supressed errors config.
                 See documentation for examples.

--watch, -w      Run in watch mode.

--stats          Print number of suppressed errors per path and error code.
```

## Suppress config

You have to pass either `--suppress` or `--suppressConfig`.

### `--suppress`

Let's ignore error `7017` in `src/js/` directory and errors `2322, 2339, 2344` in `/src/legacy/`:

```bash
tsc-silent -p tsconfig.json --suppress 7017@/src/js/ 2322,2339,2344@/src/legacy/
```

or, ignore all errors in `/src/legacy/` folder

```bash
tsc-silent -p tsconfig.json --suppress @/src/legacy/
```

or, completely ignore all errors

```bash
tsc-silent -p tsconfig.json --suppress @
```

### `--suppressConfig`

```bash
tsc-silent -p tsconfig.json --suppressConfig tsc-silent.config.js
```

See [example.config.js](./example.config.js).


## Intended/typical use

Check out [the article](https://birukov.me/blog/all/tsc-silent.html) to see the intended use.
