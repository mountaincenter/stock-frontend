import ts from "typescript";

const configName = process.argv[2] || "tsconfig.typecheck.json";
const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, configName);

if (!configPath) {
  console.error(`TypeScript config not found: ${configName}`);
  process.exit(2);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  console.error(ts.formatDiagnostic(configFile.error, formatHost()));
  process.exit(2);
}

const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  process.cwd(),
  undefined,
  configPath,
);

if (parsed.errors.length > 0) {
  console.error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, formatHost()));
  process.exit(2);
}

const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length > 0) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost()));
  process.exit(1);
}

process.exit(0);

function formatHost() {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };
}
