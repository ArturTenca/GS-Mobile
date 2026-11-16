const expoConfig = require('eslint-config-expo/flat');

const supabaseRestriction = {
  patterns: [
    {
      group: ['@/lib/supabase', '**/lib/supabase'],
      message: 'Acesse o Supabase apenas por src/services/** (camada de serviço).',
    },
  ],
};

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', 'Projeto_entrega-main/**', 'node_modules/**', '.expo/**'] },
  {
    // Pre-existing pattern from plans 05/06 (state sync inside effects); tracked as warning.
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', supabaseRestriction] },
  },
  {
    // Todo log passa por safeLog (src/security/taint/sinks.ts); filtros PostgREST nunca via template literal.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^(or|ilike|like|filter)$/] > TemplateLiteral',
          message: 'Monte filtros PostgREST com metodos tipados, nunca com template literals.',
        },
      ],
    },
  },
  {
    files: ['src/security/taint/sinks.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: [
      'src/services/**',
      'src/features/auth/**',
      'src/components/layout/DatabaseGate.tsx',
      'src/app/reset-password.tsx',
      'src/app/(auth)/index.tsx',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
];
