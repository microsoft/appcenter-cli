const path = require("path");

module.exports = {
  root: true,
  env: {
    browser: false, // turn on browser if you are running your code in the browser and need access to global variables from the browser
    jest: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: path.resolve(__dirname, "./tsconfig.json"), // this can be an array if you need to reference more than one tsconfig
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "security"],
  rules: {
    // Only the latest loaded 'instance' of a rule counts. If ESLint encounters a rule twice, the later one completely overrides the
    // earlier one.This includes rules with array parameters. Load order:
    //
    // - extends, left to right
    // - rules, top to bottom
    //
    // Hence, any "extensions" to rules like no-restricted-properties by services extending this package are not possible: they will
    // undo the rule set here.
    //
    // Please keep sorted alphabetically to avoid confusion due to rules occurring multiple times.
    "@typescript-eslint/no-array-constructor": "error",
    "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
    "@typescript-eslint/prefer-for-of": "error",
    curly: "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
    "eol-last": "error",
    "no-caller": "error",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-empty": "error",
    "no-eval": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-octal": "error",
    "no-octal-escape": "error",
    "no-redeclare": "error",
    "no-restricted-properties": [
      2,
      {
        object: "_",
        property: "assign",
      },
      {
        object: "_",
        property: "concat",
      },
      {
        object: "_",
        property: "extend",
      },
      {
        object: "Math",
        property: "random",
        message: "Use crypto.randomBytes() or window.crypto.getRandomValues() instead.",
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='execScript']",
        message: "Do not use the execScript functions",
      },
    ],
    "no-unsafe-finally": "error",
    "no-unused-labels": "error",
    "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: false, allowTernary: true }],
    "no-var": "error",
    "prefer-const": "error",
    radix: "error",
    "security/detect-non-literal-require": "error",
    "security/detect-possible-timing-attacks": "error",
  },
};
