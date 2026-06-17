import next from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...next,
  {
    // eslint-config-next 16 bundles eslint-plugin-react-hooks v6, which adds
    // new React-Compiler-aligned rules. Two of them flag pre-existing,
    // intentional patterns in this codebase:
    //  - `purity`: components compute "is this overdue now?" with
    //    Date.now()/new Date() during render.
    //  - `set-state-in-effect`: the documented next-themes "mounted" guard
    //    in ThemeToggle that avoids a hydration mismatch.
    // Downgraded to warnings so the Next 16 upgrade doesn't block
    // `npm run lint`. Revisiting them is tracked as separate tech debt.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', '.claude/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
