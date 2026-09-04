'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      if ('caches' in window) caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  return null
}
