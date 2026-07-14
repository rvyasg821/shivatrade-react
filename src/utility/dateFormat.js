/**
 * Company-aware date/time formatting utilities.
 *
 * Reads company timezone (IANA) and country (ISO 3166-1 alpha-2) from
 * localStorage so all HRM pages display consistent, locale-correct dates.
 */

import { getCompanyData } from '@src/redux/authentication'

// Map ISO country codes → BCP 47 locale tags
const COUNTRY_LOCALE_MAP = {
  GB: 'en-GB', US: 'en-US', AU: 'en-AU', IN: 'en-IN', CA: 'en-CA',
  NZ: 'en-NZ', IE: 'en-IE', ZA: 'en-ZA', SG: 'en-SG', HK: 'en-HK',
  DE: 'de-DE', FR: 'fr-FR', ES: 'es-ES', IT: 'it-IT', NL: 'nl-NL',
  PL: 'pl-PL', PT: 'pt-PT', SE: 'sv-SE', NO: 'nb-NO', DK: 'da-DK',
  FI: 'fi-FI', AE: 'ar-AE', SA: 'ar-SA', PK: 'en-PK', BD: 'en-BD',
  NG: 'en-NG', KE: 'en-KE', GH: 'en-GH', PH: 'en-PH', MY: 'ms-MY',
}

/** BCP 47 locale derived from company country, defaulting to en-GB */
const getLocale = () => {
  const company = getCompanyData()
  return COUNTRY_LOCALE_MAP[company?.selected_country] || 'en-GB'
}

/** IANA timezone from company settings, falling back to browser timezone */
const getTimezone = () => {
  const company = getCompanyData()
  return company?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
}

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * THE date format for the whole app: DD-MM-YYYY.
 *
 * Dashes, not slashes — it matches `docDate()` on the backend, so what a user
 * reads on screen is exactly what prints on the PDF. Everything used to disagree:
 * this helper produced "26/02/2026", `Utils.formatDate` produced "Feb 26, 2026",
 * and a dozen screens called `toLocaleDateString` directly.
 *
 * Accepts a plain "YYYY-MM-DD" or a full ISO datetime.
 * e.g. "2026-02-26" → "26-02-2026"  |  "2026-02-26T09:00:00Z" → "26-02-2026"
 */
export const formatDate = (value) => {
  if (!value) return '—'
  const str = String(value)
  // Plain date — parse the parts by hand rather than through `new Date()`, which
  // reads a bare "YYYY-MM-DD" as UTC midnight and shifts the day backwards for
  // anyone west of Greenwich.
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    return `${pad2(d)}-${pad2(m)}-${String(y)}`
  }
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${String(d.getFullYear())}`
}

/**
 * Format an ISO datetime string as DD-MM-YYYY h:MM AM/PM in company timezone.
 * e.g. "2026-02-26T09:00:00Z" → "26-02-2026, 9:00 AM"
 */
export const formatDateTime = (isoStr) => {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  const datePart = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${String(d.getFullYear())}`
  const timePart = new Intl.DateTimeFormat(getLocale(), {
    timeZone: getTimezone(),
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
  return `${datePart}, ${timePart}`
}

/**
 * Format an ISO datetime string as time only in company timezone with AM/PM.
 * e.g. "2026-02-26T09:00:00Z" → "9:00 AM"
 */
export const formatTime = (isoStr) => {
  if (!isoStr) return '—'
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: getTimezone(),
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoStr))
}

/**
 * Format a "HH:MM" 24-hour wall-clock string → "h:MM AM/PM".
 * Used for shift template times which are not timezone-specific.
 * e.g. "09:00" → "9:00 AM", "17:30" → "5:30 PM"
 */
export const formatTimeStr = (timeStr) => {
  if (!timeStr) return '—'
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}
