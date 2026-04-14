import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MMLabs — Управление оборотным капиталом',
    short_name: 'MMLabs',
    description: 'Проактивный AI-агент для управления оборотным капиталом',
    start_url: '/app/inbox',
    display: 'standalone',
    background_color: '#F8F7F4',
    theme_color: '#0F7B5C',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
