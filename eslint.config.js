import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        rules: {
            // TypeScript handles these
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],

            // Allow explicit any for Vue internals
            '@typescript-eslint/no-explicit-any': 'off',

            // Code style
            'no-console': 'off', // We're a logging library
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],

            // TypeScript specific
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    {
        ignores: [
            'dist/',
            'node_modules/',
            'examples/',
            'coverage/',
            '*.config.js',
            '*.config.ts',
        ],
    }
)

