import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'reactive-fsm',
  description: 'State-scoped tool availability and tool budgets for TypeScript AI agents.',
  base: '/reactive-fsm/',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: 'https://roddcode.github.io/reactive-fsm/',
  },
  head: [
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'reactive-fsm' }],
    [
      'meta',
      {
        name: 'og:description',
        content:
          'State-scoped tool availability and tool budgets for TypeScript AI agents.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/tool-gating' },
      { text: 'FAQ', link: '/faq' },
      { text: 'GitHub', link: 'https://github.com/roddcode/reactive-fsm' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Tool gating with AI SDK 7', link: '/guide/tool-gating' },
          { text: 'Tool-call budgets', link: '/guide/tool-budget' },
          { text: 'Native AI SDK vs reactive-fsm', link: '/guide/native-comparison' },
          { text: 'Contracts and limitations', link: '/guide/limitations' },
        ],
      },
      { text: 'FAQ', link: '/faq' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/roddcode/reactive-fsm' },
    ],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
    },
    footer: {
      message: 'MIT licensed',
      copyright: 'reactive-fsm',
    },
  },
})
