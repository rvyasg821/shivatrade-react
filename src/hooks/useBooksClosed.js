import { useEffect, useState } from 'react'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// ─── Financial-Year Closure (client-side mirror of the backend guard) ──────
// The company-wide "books closed up to" cutoff. Documents dated on or before
// it are rejected server-side; these helpers give the user immediate feedback
// the moment a closed date is picked, before they hit Save.

// Module-level cache so the cutoff is fetched once per app session, regardless
// of how many forms mount. Independent of the company-settings page's redux
// slice (which changes per location scope) — this always reads the
// company-wide value.
const _cache = { value: '', loaded: false, promise: null }

/** true when `iso` (YYYY-MM-DD) falls on or before the closure cutoff. */
export const isClosedPeriod = (iso, cutoff) => {
  if (!iso || !cutoff) return false
  return String(iso).slice(0, 10) <= String(cutoff).slice(0, 10)
}

/** DD/MM/YYYY for a YYYY-MM-DD string (for user-facing messages). */
const toDisplay = (ymd) => {
  if (!ymd) return ''
  const m = String(ymd).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(ymd)
}

/** Inline validation message for a date that falls in a closed period. */
export const closedPeriodMessage = (cutoff, docLabel = 'date') =>
  `Financial year is closed up to ${toDisplay(cutoff)}. This ${docLabel} falls in a closed period.`

/**
 * Returns the company-wide `books_closed_upto` cutoff (ISO string, or '' when
 * no year is closed). Fetches it once and caches; safe to call from any form.
 */
export const useBooksClosedUpto = () => {
  const [cutoff, setCutoff] = useState(_cache.value)

  useEffect(() => {
    let alive = true
    if (_cache.loaded) {
      setCutoff(_cache.value)
      return
    }
    if (!_cache.promise) {
      _cache.promise = instance
        .get(API_ENDPOINTS.companySettings.settings)
        .then((res) => {
          _cache.value = res?.data?.data?.books_closed_upto || ''
          _cache.loaded = true
        })
        .catch(() => {
          _cache.loaded = true
        })
    }
    _cache.promise.then(() => {
      if (alive) setCutoff(_cache.value)
    })
    return () => {
      alive = false
    }
  }, [])

  return cutoff
}
