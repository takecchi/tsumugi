import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: '.',
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
