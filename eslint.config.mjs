import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ languageOptions: { globals: globals.node } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		plugins: { 'simple-import-sort': simpleImportSort, 'unused-imports': unusedImports },
		rules: {
			'no-console': 'off',
			'no-debugger': 'error',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'require-yield': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'no-unused-vars': [
				'warn',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
	{ files: ['**/*.js'], languageOptions: { sourceType: 'script' } },
	{ ignores: ['node_modules/', 'dist/', 'build/'] },
	eslintPluginPrettierRecommended,
];
