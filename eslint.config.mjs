import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

	// Project-wide rule adjustments
	{
		rules: {
			// API routes use `any` legitimately in catch blocks and QB/Zenoti response shapes
			'@typescript-eslint/no-explicit-any': 'warn',
			// Quotes in JSX text are common in prose; enforce at author discretion
			'react/no-unescaped-entities': 'warn',
		},
	},

	// Intentional ts-comment suppressions — recharts incompatibilities + better-auth quirk
	{
		files: [
			'components/ui/chart.tsx',
			'components/products/view/product-view.tsx',
			'lib/auth.ts',
		],
		rules: {
			'@typescript-eslint/ban-ts-comment': 'off',
		},
	},

	// shadcn-generated hook — setState-in-effect pattern is intentional
	{
		files: ['hooks/use-mobile.ts'],
		rules: {
			'react-hooks/exhaustive-deps': 'off',
			'react-hooks/set-state-in-effect': 'off',
		},
	},

	// Packing card syncs local qty/notes state from server data after TanStack Query refetch
	{
		files: [
			'components/zenoti/view/fulfillment-view.tsx',
			'components/shopify/view/shopify-order-view.tsx',
		],
		rules: {
			'react-hooks/set-state-in-effect': 'off',
		},
	},
]);

export default eslintConfig;
