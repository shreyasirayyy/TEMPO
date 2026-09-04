type MascotProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
}

const sizeStyles = {
  sm: 'h-14 w-20',
  md: 'h-20 w-28',
  lg: 'h-28 w-40',
} as const

export function Mascot({ size = 'md', className = '', alt = 'Tempo mascot' }: MascotProps) {
  return (
    <img
      src="/branding/tempo-mascot.webp"
      alt={alt}
      aria-hidden={alt.length === 0}
      className={`${sizeStyles[size]} block shrink-0 object-contain ${className}`}
      draggable={false}
    />
  )
}
