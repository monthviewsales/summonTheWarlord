module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: ["standard"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    semi: ["error", "always"],
    "space-before-function-paren": "off",
    "comma-dangle": "off",
    "no-multi-spaces": "off",
  },
  ignorePatterns: ["node_modules/", "dist/", "coverage/"],
};
