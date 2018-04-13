module.exports = {
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    node: true,
    es6: true,
  },
  extends: 'eslint:recommended',
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'no-console': 0,
  },
};
