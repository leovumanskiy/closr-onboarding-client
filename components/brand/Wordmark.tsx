import { cn } from '@/lib/utils'

const sizes = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-6xl',
}

interface WordmarkProps {
  size?: keyof typeof sizes
  className?: string
}

export function Wordmark({ size = 'md', className }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-display font-extrabold tracking-[-0.05em] leading-none select-none',
        sizes[size],
        className
      )}
    >
      CLOSR
    </span>
  )
}
