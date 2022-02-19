// tslint:disable no-console
interface Argv {
    suppress: string[];
    compiler: string;
    project: string;
    watch: boolean;
    stats: boolean;
    help: boolean;
    suppressConfig?: string;
    _: string[];
}
const argv: Argv = require("yargs")
    .array("suppress").default("suppress", [])
    .string("compiler").default("compiler", "node_modules/typescript/lib/typescript.js")
    .string("project").alias("project", "p")
    .boolean("watch").default("watch", false).alias("watch", "w")
    .boolean("stats").default("stats", false)
    .boolean("help")
    .parse(process.argv);

if (!argv.project || argv.help || argv._.length > 2) {
    printUsage();
    process.exit(1);
}

import * as fs from "fs";
import * as path from "path";

import * as ts from "typescript";
// @ts-ignore
ts = require(path.resolve(argv.compiler));

interface StatisticsItem {
    codes: {
        [code: string]: number;
    };
    total: number;
    pathRegExp: string;
}

interface RawSupressConfig {
    codes: number[];
    pathRegExp: string;
}

interface SupressConfigFile {
    suppress: RawSupressConfig[];
}

interface SupressConfig {
    codes: number[];
    pathRegExp: RegExp | null;
}

const config = (
    argv.suppressConfig
        ? require(path.resolve(argv.suppressConfig)) as SupressConfigFile
        : null
);

const supressConfig = (
    config
        ? parseSuppressRules(config.suppress)
        : argv.suppress.map(prepareSuppressArg)
);

console.log(`Using TypeScript compiler version ${ts.version} from ${path.resolve(argv.compiler)}`);
const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (filename: string) => filename,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
};

if (argv.watch) {
    let watchDiagnostics: ts.Diagnostic[] = [];
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;
    const watchCompilerHost = ts.createWatchCompilerHost(
        argv.project,
        {},
        ts.sys,
        createProgram,
        function reportDiagnostic(diagnostic: ts.Diagnostic) {
            watchDiagnostics.push(diagnostic);
        },
        function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
            if (diagnostic.code === 6031 || diagnostic.code === 6032) { // Starting compilation | File change detected
                process.stdout.write("\u001b[2J\u001b[0;0H"); // clear console
                watchDiagnostics = [];
                assertDiagnostics(diagnostic, formatHost, false);
            } else if (diagnostic.code === 6194) { // Compilation done
                assertDiagnostics(diagnostic, formatHost, false);
                assertDiagnostics(watchDiagnostics, formatHost);
                console.log("Watching for file changes.");
            }
        }
    );
    const origCreateProgram = watchCompilerHost.createProgram;
    watchCompilerHost.createProgram = (
        rootNames,
        options,
        wcHost,
        oldProgram
    ) => origCreateProgram(rootNames, options, wcHost, oldProgram);
    const origPostProgramCreate = watchCompilerHost.afterProgramCreate;
    watchCompilerHost.afterProgramCreate = program => {
        origPostProgramCreate!(program);
    };
    ts.createWatchProgram(watchCompilerHost);
} else {
    const configObject = ts.parseConfigFileTextToJson(argv.project, fs.readFileSync(argv.project).toString());
    assertDiagnostics(configObject.error, formatHost, false);

    const configParseResult
        = ts.parseJsonConfigFileContent(configObject.config, ts.sys, process.cwd(), undefined, argv.project);
    assertDiagnostics(configParseResult.errors, formatHost, false);

    const compilerHost = ts.createCompilerHost(configParseResult.options);
    const programOptions = {
        rootNames: configParseResult.fileNames,
        options: configParseResult.options,
        projectReferences: configParseResult.projectReferences,
        host: compilerHost,
        configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(configParseResult)
    };
    const program = ts.createProgram(programOptions);
    const emitResult = program.emit();

    if (configParseResult.options.noEmitOnError) {
      console.warn('You have `noEmitOnError` enabled, if any error occurs TypeScript will not generate any JavaScript output files even if `tsc-silent` exits with 0.');
    }

    process.exit(
        assertDiagnostics(ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics), compilerHost),
    );
}

// @ts-ignore   // ********************************
return;         // Only functions follow this point
                // ********************************

function assertDiagnostics(
    diagnostics: ts.Diagnostic[] | ts.Diagnostic | undefined,
    formatDiagnosticsHost: ts.FormatDiagnosticsHost,
    allowSuppress = true,
): number {
    if (!diagnostics) {
        return 0;
    }
    if (!Array.isArray(diagnostics)) {
        diagnostics = [diagnostics];
    }
    if (!diagnostics.length) {
        return 0;
    }

    let diagnosticsToShow: ts.Diagnostic[] = [];
    const suppressedDiagnostics: ts.Diagnostic[] = [];

    if (allowSuppress) {
        for (let d of diagnostics) {
            if (isSuppressed(d.code, d.file && d.file.fileName)) {
                suppressedDiagnostics.push(d);
            } else {
                diagnosticsToShow.push(d);
            }
        }
    } else {
        diagnosticsToShow = diagnostics;
    }

    if (diagnosticsToShow.length) {
        // console.(error | warn) does not allow to grep output (OS X)
        console.log(ts.formatDiagnosticsWithColorAndContext(diagnosticsToShow, formatDiagnosticsHost));
    }
    if (allowSuppress) {
        if (argv.stats) {
            console.log(JSON.stringify(getStatistics(suppressedDiagnostics), null, "  "));
        }
        console.warn(`Visible errors: ${diagnosticsToShow.length}, suppressed errors: ${suppressedDiagnostics.length}`);
    }
    if (diagnosticsToShow.length) {
        return 2;
    }
    return 0;
}

function prepareSuppressArg(arg: string) {
    const suppress: SupressConfig = {
        codes: [],
        pathRegExp: null,
    };
    const pathIndex = arg.indexOf("@");
    if (pathIndex === -1) {
        console.error(`Cannot parse suppression '${arg}'`);
        printUsage();
        process.exit(1);
    }
    if (pathIndex > 0) {
        suppress.codes = arg.substr(0, pathIndex).split(",").map(Number);
    }
    if (pathIndex < arg.length - 1) {
        suppress.pathRegExp = new RegExp(arg.substr(pathIndex + 1));
    }
    return suppress;
}

function parseSuppressRules(suppressRules: RawSupressConfig[]): SupressConfig[] {
    return suppressRules.map((rule) => ({
        ...rule,
        pathRegExp: new RegExp(rule.pathRegExp),
    }));
}

function isSuppressed(code: number, fileName?: string) {
    if (!fileName) {
        return false;
    }
    for (const suppress of supressConfig) {
        if (suppress.codes.length && suppress.codes.indexOf(code) === -1) {
            continue;
        }
        if (suppress.pathRegExp && !suppress.pathRegExp.test(fileName)) {
            continue;
        }
        return true;
    }
    return false;
}

function getStatistics(suppressedDiagnostics: ts.Diagnostic[]): StatisticsItem[] {
    const statistics = [];
    for (const suppress of supressConfig) {
        const statisticsItemCodes: StatisticsItem["codes"] = {};
        for (let code of suppress.codes) {
            statisticsItemCodes[code] = 0;
        }
        const statisticsItem: StatisticsItem = {
            codes: statisticsItemCodes,
            pathRegExp: (suppress.pathRegExp || "").toString(),
            total: 0,
        };
        statistics.push(statisticsItem);
        for (let suppressedDiag of suppressedDiagnostics) {
            if (suppress.pathRegExp && suppress.pathRegExp.test(suppressedDiag.file!.fileName)) {
                statisticsItem.total++;
                if (suppress.codes.length && suppress.codes.indexOf(suppressedDiag.code) !== -1) {
                    statisticsItemCodes[suppressedDiag.code]++;
                }
            }
        }
    }
    return statistics;
}

function printUsage() {
    console.log("Usage:");
    console.log("  tsc-silent --project <path> [--suppress config | --suppressConfig path] [--compiler path]");
    console.log("             [--watch]");
    console.log();
    console.log("Synopsis:");
    console.log("  --project, -p    Path to tsconfig.json");
    console.log();
    console.log("  --compiler       Path to typescript.js.");
    console.log("                   By default, uses `./node_modules/typescript/lib/typescript.js`.");
    console.log();
    console.log("  --suppress       Suppressed erros.");
    console.log("                   E.g. `--suppress 7017@src/js/ 2322,2339,2344@/src/legacy/`.")
    console.log();
    console.log("  --suppressConfig Path to supressed errors config.");
    console.log("                   See documentation for examples.");
    console.log();
    console.log("  --watch, -w      Run in watch mode.");
    console.log();
    console.log("  --stats          Print number of suppressed errors per path and error code.");
    console.log();
    console.log("Description:");
    console.log("The purpose of the wrapper is to execute TypeScript compiler but suppress some error messages");
    console.log("coming from certain files/folders. For example, this can be used to enable `noImplicitAny` in");
    console.log("some parts of the project while keeping it disabled in others.");
    console.log();
}
