import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'apps/web/src/art/generated.ts'] },
  ...tseslint.configs.recommended,
);
