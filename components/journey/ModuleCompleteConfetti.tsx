'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4']
const SHAPES = ['circle', 'rect', 'rect']

export function ModuleCompleteConfetti({ moduleId }: { moduleId: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storageKey = `confetti_shown_${moduleId}`
    if (localStorage.getItem(storageKey)) return
    localStorage.setItem(storageKey, '1')

    const container = ref.current
    if (!container) return

    const particles: HTMLDivElement[] = []
    const count = 90

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
      const size = 7 + Math.random() * 9
      const delay = Math.random() * 1.2
      const duration = 2.4 + Math.random() * 1.8
      const xStart = Math.random() * 100
      const xDrift = (Math.random() - 0.5) * 200

      el.style.cssText = `
        position: absolute;
        left: ${xStart}%;
        top: -16px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${shape === 'circle' ? '50%' : '2px'};
        opacity: 0;
        animation: confetti-fall-${i} ${duration}s ${delay}s ease-in forwards;
        transform: rotate(${Math.random() * 360}deg);
      `

      const keyframes = `
        @keyframes confetti-fall-${i} {
          0%   { top: -16px; opacity: 1; transform: translateX(0) rotate(0deg); }
          100% { top: 100vh; opacity: 0; transform: translateX(${xDrift}px) rotate(${360 + Math.random() * 360}deg); }
        }
      `
      const style = document.createElement('style')
      style.textContent = keyframes
      document.head.appendChild(style)

      container.appendChild(el)
      particles.push(el)

      const cleanup = () => {
        el.remove()
        style.remove()
      }
      setTimeout(cleanup, (delay + duration) * 1000 + 100)
    }

    return () => {
      particles.forEach(p => p.remove())
    }
  }, [])

  return <div ref={ref} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden />
}
