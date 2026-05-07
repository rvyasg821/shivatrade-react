import { useEffect, useRef, useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

/**
 * Shared phone input with a flag/country selector.
 *
 * Storage model (Option A):
 *   country_code = { dial_code, phone, formatted, country_iso }
 *     dial_code   — "+91"
 *     phone       — raw digits, dial_code stripped ("9876543210")
 *     formatted   — display string ("+91 98765-43210")
 *     country_iso — "IN" (used to render the flag on hydration)
 *
 * The bare digits are also mirrored to the consumer's existing phone column
 * (e.g. `mobile` / `phone` / `contact_phone`) so legacy queries keep working.
 *
 * Props:
 *   value          — { dial_code, phone, formatted, country_iso } (or null)
 *   phone          — fallback raw digits (from the dedicated phone column);
 *                    used when `value.phone` is missing — e.g. records saved
 *                    before this component existed where country_code is
 *                    null but contact_phone has the digits.
 *   onChange       — (next, countryMeta) => void
 *   defaultCountry — ISO-2 lowercase. Default "in".
 *   disabled       — locks the widget read-only.
 */
const PhoneInputField = ({
  value,
  phone,
  onChange,
  defaultCountry = "in",
  disabled = false,
  inputProps = {},
}) => {
  // Always resolve to a country — defaultCountry is the last fallback so the
  // library always has a flag to render and a format mask to apply.
  const country =
    value?.country_iso?.toLowerCase() || defaultCountry;

  // Reconstruct the full international number (no leading +) for the lib.
  // Phone digits come from value.phone first, then the prop fallback so
  // legacy records hydrate correctly.
  const phoneDigits = value?.phone || phone || "";
  const dialDigits = (value?.dial_code || "").replace("+", "");
  const fullNumber = `${dialDigits}${phoneDigits}`;

  // react-phone-input-2 reads its initial value once on mount and ignores
  // later prop changes — common headache when the form hydrates async.
  // Bump a `mountKey` whenever the inbound number transitions from empty
  // to non-empty (i.e. real hydration arrives) so the input remounts with
  // the new initial value. After that, normal typing updates work fine
  // and don't re-trigger the bump.
  const [mountKey, setMountKey] = useState(0);
  const hadDataRef = useRef(!!fullNumber);
  useEffect(() => {
    if (fullNumber && !hadDataRef.current) {
      hadDataRef.current = true;
      setMountKey((k) => k + 1);
    }
  }, [fullNumber]);

  return (
    <PhoneInput
      key={mountKey}
      country={country}
      value={fullNumber}
      enableSearch
      autoFormat
      // Lock dial-code keystrokes (flag dropdown still works). If user can
      // wipe the prefix via Ctrl+A/backspace, onChange fires with a value
      // missing the dial code — our digits-strip becomes a no-op and the
      // saved `formatted` ends up malformed. Keeping it sticky guarantees
      // dial_code/phone/formatted stay consistent.
      countryCodeEditable={false}
      disabled={disabled}
      inputStyle={{ width: "100%" }}
      dropdownStyle={{ maxHeight: "200px" }}
      containerClass="phone-input"
      onChange={(val, countryMeta, _e, formatted) => {
        const dial = countryMeta?.dialCode
          ? `+${countryMeta.dialCode}`
          : "";
        const digits = (val || "").replace(countryMeta?.dialCode || "", "");
        // Skip the noisy on-mount call where the lib fires onChange with the
        // current value unchanged (no new digits typed). Without this guard,
        // hydrated edits get wiped to default-country empty on first render.
        if (
          !digits &&
          !phoneDigits &&
          countryMeta?.countryCode?.toUpperCase() ===
            (value?.country_iso || "").toUpperCase()
        ) {
          return;
        }
        const next = {
          dial_code: dial,
          phone: digits,
          formatted: formatted || "",
          country_iso: (countryMeta?.countryCode || "").toUpperCase(),
        };
        onChange(next, countryMeta);
      }}
      inputProps={inputProps}
    />
  );
};

export default PhoneInputField;
