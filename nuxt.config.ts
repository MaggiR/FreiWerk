// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxtjs/color-mode',
    'nuxt-auth-utils',
    'nuxt-security',
    '@nuxt/test-utils/module',
  ],

  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'freiwerk-color-mode',
  },

  runtimeConfig: {
    databaseUrl: '',
    session: {
      // Overridden at runtime via NUXT_SESSION_PASSWORD
      password: '',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    public: {
      appName: 'FreiWerk',
    },
  },

  // nuxt-security: secure headers + rate limiting + CSRF.
  // We sanitize rich-text server-side ourselves (server/utils/sanitize.ts), so the
  // built-in xssValidator is disabled to avoid rejecting legitimate TipTap HTML.
  security: {
    rateLimiter: {
      tokensPerInterval: 500,
      interval: 60_000,
    },
    // CSRF via nuxt-security requires $csrfFetch/useCsrfFetch for every mutating
    // request. For the MVP we rely on the sealed, SameSite=lax session cookie
    // (nuxt-auth-utils) for baseline CSRF protection. Revisit post-MVP.
    csrf: false,
    xssValidator: false,
    requestSizeLimiter: {
      maxRequestSizeInBytes: 5_000_000,
      maxUploadFileRequestInBytes: 10_000_000,
    },
    headers: {
      crossOriginEmbedderPolicy: 'unsafe-none',
      // Strict nonce-based CSP is disabled for the MVP to avoid breaking SSR/dev
      // (Vite inline styles, TipTap inline styles). XSS is mitigated by
      // server-side sanitization (server/utils/sanitize.ts). Revisit post-MVP.
      contentSecurityPolicy: false,
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      title: 'FreiWerk',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'FreiWerk — digitale Beteiligungsplattform für politische Initiativen.',
        },
      ],
    },
  },
})
