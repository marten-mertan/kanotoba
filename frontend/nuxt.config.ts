export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
  ],

  devtools: { enabled: true },

  app: {
    baseURL: '/kanotoba/',
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'Kanotoba',

      /**
       * Метатеги, фавиконки и т.п
       * Для генерации фавиконок - https://realfavicongenerator.net/
       */
      meta: [
        {
          charset: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          name: 'title',
          content: 'Kanotoba',
        },
        {
          name: 'description',
          content: 'Kanotoba description',
        },
        {
          name: 'author',
          content: 'Mertan',
        },
        {
          name: 'msapplication-TileColor',
          content: '#e7609e',
        },
        {
          name: 'theme-color',
          content: '#ffffff',
        },
      ],
      link: [
        /* Favicons */
        { rel: 'icon', type: 'image/x-icon', href: '/kanotoba/favicons/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/kanotoba/favicons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/kanotoba/favicons/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/kanotoba/favicons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/kanotoba/favicons/site.webmanifest' },
        { rel: 'mask-icon', href: '/kanotoba/favicons/safari-pinned-tab.svg', color: '#e7609e' },
      ],
    },
  },

  css: [
    '~/assets/scss/vendors.scss',
    '~/assets/scss/common.scss',
  ],

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || process.env.API_URL || '',
      previewMode: process.env.NODE_ENV === 'development' && process.env.PREVIEW_MODE === 'true',
      previewApiKey: process.env.NODE_ENV === 'development' && process.env.PREVIEW_MODE === 'true' ? process.env.PREVIEW_API_KEY || '' : '',
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  compatibilityDate: '2025-03-09',

  /* Миксины и переменные доступны во всех компонентах и во всех scss файлах */
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/scss/shared.scss" as *;',
        },
      },
    },

    /* Настройки для обработки .vue-файлов с TypeScript */
    vue: {
      script: {
        defineModel: true, // Поддержка defineModel для TS
        propsDestructure: true, // Поддержка деструктуризации пропсов
      },
    },

    /* TypeScript трансформируется через Oxc; target по умолчанию — esnext. */
  },

  /* Добавляем настройки TypeScript */
  typescript: {
    strict: true,
    shim: false,
    typeCheck: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
