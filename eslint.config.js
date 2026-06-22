const js = require('@eslint/js');
const globals = require('globals');
const n = require('eslint-plugin-n');
const prettier = require('eslint-config-prettier');

module.exports = [
  // Глобальные игноры (отдельный объект — только так работает в flat config)
  {
    ignores: [
      'client/**',
      'node_modules/**',
      'coverage/**',
      'prisma/migrations/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  // Backend (Node.js, CommonJS)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    plugins: { n },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-console': 'off',
      'no-process-exit': 'off',
      'n/no-process-exit': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
    },
  },
  // Тесты (Jest)
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
  prettier,
];
