import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'Bytespider',
          'PerplexityBot',
          'Cohere-ai',
          'FacebookBot',
          'Applebot-Extended',
          'Diffbot',
          'ImagesiftBot',
          'Omgilibot',
          'YouBot',
        ],
        disallow: '/',
      },
    ],
  }
}
