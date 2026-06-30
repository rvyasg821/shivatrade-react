// ** React Imports
import { useState, useEffect } from 'react'

// ** Live viewport / breakpoint info — single source of truth for the few
// places where layout has to be decided in JS (e.g. render a mobile card list
// vs a desktop table, or set a modal's size). For everything that CSS can
// express, prefer Bootstrap responsive utilities/classes instead of this hook.
//
// Breakpoints mirror Bootstrap 5 exactly (the same ones the SCSS uses):
//   sm 576 · md 768 · lg 992 · xl 1200 · xxl 1400
//
// SSR-safe: defaults to a desktop width when `window` is unavailable.

const BREAKPOINTS = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 }

const getWidth = () => (typeof window !== 'undefined' ? window.innerWidth : 1200)

export const useBreakpoint = () => {
  const [width, setWidth] = useState(getWidth)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    // Debounce resize via requestAnimationFrame so we re-render at most once
    // per frame instead of on every resize tick.
    let frame = null
    const onResize = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        setWidth(window.innerWidth)
      })
    }

    window.addEventListener('resize', onResize)
    // Sync once on mount in case width changed before the listener attached.
    onResize()

    return () => {
      window.removeEventListener('resize', onResize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  // `down('md')` → true when narrower than md (the "md-down" range).
  // `up('lg')`   → true when at least lg wide.
  const down = (bp) => width < (BREAKPOINTS[bp] || 0)
  const up = (bp) => width >= (BREAKPOINTS[bp] || 0)

  return {
    width,
    isMobile: width < BREAKPOINTS.md, // < 768  (phones)
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg, // 768–991
    isDesktop: width >= BREAKPOINTS.lg, // ≥ 992
    down,
    up
  }
}

export default useBreakpoint
