module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@fintechstudios/chai-as-promised/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:node/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'require-await': 'error',
    '@fintechstudios/chai-as-promised/no-unhandled-promises': 'error',
    '@fintechstudios/chai-as-promised/no-await-in-condition': 'error',
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
    'node/no-unpublished-import': 'off',
    'node/no-missing-import': 'off',
  },
};
