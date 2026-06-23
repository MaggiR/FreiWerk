/** Hide Nuxt DevTools when APP_MODE is demo or production (config alone may not suffice in nuxt dev). */
export default defineNuxtPlugin({
  name: 'freiwerk-disable-devtools',
  setup() {
    if (!import.meta.dev) return

    const { public: pub } = useRuntimeConfig()
    if (pub.appMode === 'dev') return

    useHead({
      style: [
        {
          innerHTML:
            '#nuxt-devtools-container, nuxt-devtools, .nuxt-devtools-panel { display: none !important; visibility: hidden !important; }',
        },
      ],
    })
  },
})
