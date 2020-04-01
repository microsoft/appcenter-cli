module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    mocha: true,
    node: true,
  },
  extends: [
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ["@typescript-eslint", "security"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: "module",
  },
  reportUnusedDisableDirectives: true,
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
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};
