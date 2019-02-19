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
```

## Suppress config

You have to pass either `--suppress` or `--suppressConfig`.

### `--suppress`

```bash
tsc-silent -p tsconfig.json --suppress 7017@src/js/ 2322,2339,2344@/src/legacy/
```

### `--suppressConfig`

```bash
tsc-silent -p tsconfig.json --suppressConfig tsc-silent.config.js
```

See [example.config.js](./example.config.js) for more details.
