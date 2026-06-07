// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
  },
}).append({
  ignores: [
    '.nuxt/**',
    '.output/**',
    'node_modules/**',
    'dist/**',
    'server/database/migrations/**',
  ],
})
