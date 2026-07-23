import basics from 'eslint-config-cozy-app/basics'
import cozyReact from 'eslint-config-cozy-app/react'

const baseImportOrderRule = basics.find(c => c.rules?.['import/order'])?.rules[
  'import/order'
]
const baseImportOrderOptions = baseImportOrderRule[1]
const basePathGroups = baseImportOrderOptions.pathGroups

export default [
  ...cozyReact,
  {
    // React Compiler diagnostics (eslint-plugin-react-hooks v6) are advisory
    // performance/correctness hints, not "code is broken" errors. Upstream has
    // not yet conformed its own code to them (e.g. src/modules/views/Folder/
    // useSyncingFakeFile.js trips react-hooks/refs). Keep them as warnings so
    // they surface without blocking CI; revert to errors once the codebase is
    // migrated wholesale.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn'
    }
  },
  {
    rules: {
      'import/order': [
        'warn',
        {
          ...baseImportOrderOptions,
          pathGroups: [
            ...basePathGroups,
            { pattern: '**/*.styl', group: 'index', position: 'after' },
            { pattern: 'test/**/*', group: 'index' },
            { pattern: 'lib/**/*', group: 'index' },
            { pattern: 'hooks/**/*', group: 'index' },
            { pattern: 'components/**/*', group: 'index' },
            { pattern: 'modules/**/*', group: 'index' },
            { pattern: 'assets/**/*', group: 'index' },
            { pattern: 'models/**/*', group: 'index' },
            { pattern: 'config/**/*', group: 'index' },
            { pattern: 'constants/**/*', group: 'index' },
            { pattern: 'locales/**/*', group: 'index' },
            { pattern: 'queries', group: 'index' }
          ]
        }
      ]
    }
  }
]
