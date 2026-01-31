import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // 幽霊依存の検出 - 宣言されていない依存関係の使用を禁止
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.{js,jsx,ts,tsx}',
            '**/*.spec.{js,jsx,ts,tsx}',
            '**/*.stories.{js,jsx,ts,tsx}',
            '**/test/**',
            '**/tests/**',
            '**/__tests__/**',
            '**/playwright.config.{js,ts}',
            '**/vite.config.{js,ts}',
            '**/tsup.config.{js,ts}',
            '**/eslint.config.{js,ts}',
            '**/.storybook/**',
            '**/storybook-static/**',
          ],
          optionalDependencies: false,
          peerDependencies: true,
        },
      ],
      // 未解決のimportを検出
      'import/no-unresolved': 'error',
      // 存在しないexportのimportを検出
      'import/named': 'error',
      // defaultでないexportをdefaultとしてimportすることを禁止
      'import/default': 'error',
      // 名前空間importの誤用を検出
      'import/namespace': 'error',
      // 無効なexportを検出
      'import/export': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.json',
            './packages/*/tsconfig.json',
            './apps/*/tsconfig.json',
          ],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/*.d.ts',
    ],
  },
);
