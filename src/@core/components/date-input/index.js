import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "react-feather";
import "./date-input.scss";

/**
 * DateInput - stable date picker with manual typing + calendar popup.
 * No Flatpickr - plain React input + custom calendar grid.
 * Stores ISO YYYY-MM-DD, displays DD/MM/YYYY.
 */
const DateInput = ({
  field,
  id,
  placeholder = "DD/MM/YYYY",
  maxDate,
  minDate,
  invalid = false,
  disabled = false,
  className = "",
  onChange: onChangeProp,
  value: valueProp,
  onBlur: onBlurProp,
  ...rest
}) => {
  const value = field ? field.value : valueProp;
  const name = field ? field.name : rest.name;

  const [displayVal, setDisplayVal] = useState(() => isoToDisplay(value));
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => valueToViewDate(value));
  const [popupStyle, setPopupStyle] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);

  // Compute viewport-fixed coords for the portalled calendar. Flips upward
  // when there isn't enough room below the input.
  const reposition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const calendarHeight = 320;
    const calendarWidth = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const above = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(rect.left, 8),
      window.innerWidth - calendarWidth - 8
    );
    setPopupStyle({
      position: "fixed",
      left,
      top: above ? rect.top - calendarHeight - 4 : rect.bottom + 4,
      zIndex: 9999,
    });
  }, []);

  // Recompute position on open and on every scroll/resize while open.
  useEffect(() => {
    if (!open) return;
    reposition();
    const handle = () => reposition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, reposition]);

  // Sync display when external value changes
  useEffect(() => {
    setDisplayVal(isoToDisplay(value));
  }, [value]);

  // Close calendar on outside click. Check BOTH the wrapper and the portal
  // since the popup is no longer a DOM child of the wrapper.
  useEffect(() => {
    const handler = (e) => {
      const inWrapper = wrapperRef.current?.contains(e.target);
      const inPopup = popupRef.current?.contains(e.target);
      if (!inWrapper && !inPopup) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resolvedMax = useMemo(() => resolveDate(maxDate), [maxDate]);
  const resolvedMin = useMemo(() => resolveDate(minDate), [minDate]);

  const commitISO = useCallback((iso) => {
    setDisplayVal(isoToDisplay(iso));
    if (field) field.onChange(iso);
    if (onChangeProp) {
      const d = iso ? parseDateISO(iso) : null;
      onChangeProp(d ? [d] : [], isoToDisplay(iso), iso);
    }
  }, [field, onChangeProp]);

  const handleBlurInput = useCallback(() => {
    const typed = displayVal.trim();
    if (!typed) {
      commitISO("");
    } else {
      const parsed = parseTypedDate(typed);
      if (parsed) {
        commitISO(formatToISO(parsed));
        setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      } else {
        // Invalid - revert
        setDisplayVal(isoToDisplay(value));
      }
    }
    if (field?.onBlur) field.onBlur();
    if (onBlurProp) onBlurProp();
  }, [displayVal, value, commitISO, field, onBlurProp]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlurInput();
      setOpen(false);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }, [handleBlurInput]);

  const handleDayClick = useCallback((date) => {
    const iso = formatToISO(date);
    commitISO(iso);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(false);
    inputRef.current?.focus();
  }, [commitISO]);

  const toggleCalendar = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      if (!prev && value) {
        const d = parseDateISO(value);
        if (d) setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
      return !prev;
    });
  }, [disabled, value]);

  return (
    <div className="date-input-wrapper" ref={wrapperRef}>
      <div className="date-input-field">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={displayVal}
          onChange={(e) => setDisplayVal(e.target.value)}
          onBlur={handleBlurInput}
          onKeyDown={handleKeyDown}
          onFocus={() => !open && setOpen(true)}
          placeholder={placeholder}
          className={`form-control ${invalid ? "is-invalid" : ""} ${className}`.trim()}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="date-input-toggle"
          onClick={toggleCalendar}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Open calendar"
        >
          <Calendar size={16} />
        </button>
      </div>

      {open && popupStyle &&
        createPortal(
          <div ref={popupRef} style={popupStyle}>
            <CalendarDropdown
              viewDate={viewDate}
              setViewDate={setViewDate}
              selectedISO={value}
              onDayClick={handleDayClick}
              maxDate={resolvedMax}
              minDate={resolvedMin}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

// ─── Calendar Dropdown ──────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const CalendarDropdown = ({ viewDate, setViewDate, selectedISO, onDayClick, maxDate, minDate }) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = formatToISO(new Date());

  // Generate year options (100 years back, 10 years forward)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 10; y >= currentYear - 100; y--) years.push(y);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Build day grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells = [];
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrev - i);
    cells.push({ date: d, outside: true });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), outside: false });
  }
  // Next month leading days
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), outside: true });
  }

  return (
    <div className="date-input-calendar">
      {/* Header: month/year selectors + nav */}
      <div className="dic-header">
        <button type="button" className="dic-nav" onClick={prevMonth}>&lsaquo;</button>
        <div className="dic-selectors">
          <select
            value={month}
            onChange={(e) => setViewDate(new Date(year, parseInt(e.target.value), 1))}
            className="dic-select"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setViewDate(new Date(parseInt(e.target.value), month, 1))}
            className="dic-select"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" className="dic-nav" onClick={nextMonth}>&rsaquo;</button>
      </div>

      {/* Weekday headers */}
      <div className="dic-weekdays">
        {DAYS.map((d) => <div key={d} className="dic-weekday">{d}</div>)}
      </div>

      {/* Day grid */}
      <div className="dic-days">
        {cells.map(({ date, outside }, idx) => {
          const iso = formatToISO(date);
          const isSelected = iso === selectedISO;
          const isToday = iso === today;
          const isDisabled =
            outside ||
            (maxDate && iso > formatToISO(maxDate)) ||
            (minDate && iso < formatToISO(minDate));

          return (
            <button
              key={idx}
              type="button"
              className={[
                "dic-day",
                outside && "dic-outside",
                isSelected && "dic-selected",
                isToday && !isSelected && "dic-today",
                isDisabled && "dic-disabled",
              ].filter(Boolean).join(" ")}
              disabled={isDisabled}
              onClick={() => !isDisabled && onDayClick(date)}
              tabIndex={-1}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────

function formatToISO(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDisplay(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, "0");
    const m = String(val.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${val.getFullYear()}`;
  }
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return "";
}

function parseDateISO(str) {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

function parseTypedDate(str) {
  if (!str) return null;
  const s = str.trim();
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const date = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    if (!isNaN(date.getTime()) && date.getDate() === parseInt(m[1])) return date;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const date = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    if (!isNaN(date.getTime()) && date.getDate() === parseInt(m[3])) return date;
  }
  return null;
}

function resolveDate(val) {
  if (!val) return null;
  if (val === "today") return new Date();
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = parseDateISO(val);
    return d || new Date(val);
  }
  return null;
}

function valueToViewDate(val) {
  if (!val) return new Date();
  const d = val instanceof Date ? val : parseDateISO(val);
  return d ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date();
}

export default DateInput;
