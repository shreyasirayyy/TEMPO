import type { HTMLAttributes } from 'react'

type TempoLogoProps = HTMLAttributes<HTMLSpanElement> & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  wordmarkClassName?: string
  alt?: string
  variant?: 'default' | 'on-dark'
}

const sizeStyles = {
  xs: { mark: 'h-7 w-7', wordmark: 'text-lg' },
  sm: { mark: 'h-9 w-9', wordmark: 'text-xl' },
  md: { mark: 'h-12 w-12', wordmark: 'text-2xl' },
  lg: { mark: 'h-20 w-20', wordmark: 'text-4xl' },
  xl: { mark: 'h-28 w-28', wordmark: 'text-6xl' },
} as const

export function TempoLogo({
  size = 'md',
  showWordmark = false,
  wordmarkClassName = '',
  alt = 'Tempo',
  variant = 'default',
  className = '',
  ...spanProps
}: TempoLogoProps) {
  const styles = sizeStyles[size]
  const variantClass = variant === 'on-dark' ? 'rounded-2xl bg-tempo-cream/95 p-1.5' : ''

  return (
    <span className={`inline-flex items-center gap-2 ${variantClass} ${className}`} {...spanProps}>
      <img
        src="/branding/tempo-logo.webp"
        alt={showWordmark ? alt : alt}
        className={`${styles.mark} block shrink-0 object-contain`}
        draggable={false}
      />
      {showWordmark && <span className={`serif leading-none ${styles.wordmark} ${wordmarkClassName}`}>tempo</span>}
    </span>
  )
}
