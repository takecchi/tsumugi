import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import pluginPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'storybook-static',
      '.visual-tests',
      '.storybook',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  pluginJsxA11y.flatConfigs.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      react: pluginReact,
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: '.',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: globals.browser,
    },
    rules: {
      // void型の仕様を制限
      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowAsThisParameter: false, allowInGenericTypeArguments: true },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      // boolean 型の Props の渡し方を統一
      'react/jsx-boolean-value': 'warn',
      // React Fragment の書き方を統一
      'react/jsx-fragments': 'warn',
      // Props と children で不要な中括弧を削除
      'react/jsx-curly-brace-presence': 'warn',
      // 不要な React Fragment を削除
      'react/jsx-no-useless-fragment': 'warn',
      // 子要素がない場合は自己終了タグを使う
      'react/self-closing-comp': 'warn',
      // コンポーネント名をパスカルケースに統一
      'react/jsx-pascal-case': 'warn',
      // Props の型チェックは TS で行う & 誤検知があるため無効化
      'react/prop-types': 'off',
      // 使ってない変数を警告
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  pluginPrettier,
);
