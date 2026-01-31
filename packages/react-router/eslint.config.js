import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
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
    },
    rules: {
      // void型の仕様を制限
      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowAsThisParameter: false, allowInGenericTypeArguments: true },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
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
