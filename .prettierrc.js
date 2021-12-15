module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  printWidth: 120,
  overrides: [
    {
      // see: https://github.com/prettier-solidity/prettier-plugin-solidity#configuration-file
      files: '*.sol',
      options: {
        printWidth: 120,
        tabWidth: 4,
        useTabs: false,
        singleQuote: false,
        bracketSpacing: false,
        explicitTypes: 'always',
      },
    },
  ],
};
