import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tempo — Your priorities, in rhythm.',
    short_name: 'Tempo',
    description: 'Priority-aware planning for students.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8f4ed',
    theme_color: '#2f7d69',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
