/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Vue-specific rules
    'vue/multi-word-component-names': 'off', // Allow single-word component names
    'vue/no-v-html': 'warn', // Warn against v-html (XSS risk)
    'vue/require-default-prop': 'off', // Not always necessary with TypeScript/PropTypes
    'vue/require-prop-types': 'warn', // Encourage prop types
    'vue/component-tags-order': ['warn', {
      order: ['script', 'template', 'style']
    }],
    'vue/no-unused-vars': 'error',
    'vue/no-unused-components': 'warn',
    'vue/no-template-shadow': 'error',
    'vue/no-mutating-props': 'error',
    'vue/attribute-hyphenation': ['error', 'always'],
    'vue/v-on-event-hyphenation': ['error', 'always'],

    // JavaScript best practices
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern': '^_',
    }],
    'no-var': 'error', // Require let or const
    'prefer-const': 'error', // Prefer const when not reassigning
    'prefer-arrow-callback': 'warn',
    'arrow-body-style': ['warn', 'as-needed'],
    'object-shorthand': ['warn', 'always'],
    'prefer-template': 'warn',
    'prefer-destructuring': ['warn', {
      array: false,
      object: true,
    }],

    // Code quality
    'eqeqeq': ['error', 'always'], // Require === and !==
    'curly': ['error', 'all'], // Require braces for all control statements
    'no-implicit-coercion': 'warn',
    'no-return-await': 'warn',
    'require-await': 'warn',
    'no-throw-literal': 'error',

    // Async/Promise handling
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'warn',
    'prefer-promise-reject-errors': 'error',

    // Performance
    'no-loop-func': 'warn',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js', '**/__tests__/**'],
      env: {
        vitest: true,
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '*.config.js',
    '*.config.cjs',
  ],
}
