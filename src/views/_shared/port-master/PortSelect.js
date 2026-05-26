// PortSelect - reusable AsyncSelect for picking a port from `port_master`.
//
// Usage:
//   <PortSelect
//     value={port_of_loading_snapshot}        // { _id, code, name, type, state, country_code, display_label }
//     onChange={(port) => {                   // null on clear, full object on pick
//       setValue("port_of_loading_id", port?._id || null);
//       setValue("port_of_loading_snapshot", port || null);
//     }}
//     countryCode="IN"                        // filter by country (default IN)
//     types={["sea", "icd", "sez"]}           // mode-restricted filter
//     placeholder="Search port by code or name…"
//   />
//
// The parent owns BOTH the FK (`*_id`) and the jsonb snapshot column.
// PortSelect just gives back the picked port object; saving snapshot is
// the parent's responsibility.

import { useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import PropTypes from "prop-types";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const buildLabel = (p) => {
  if (!p) return "";
  if (p.display_label) return p.display_label;
  const tail = [p.state, p.type ? String(p.type).toUpperCase() : null]
    .filter(Boolean)
    .join(", ");
  return tail ? `${p.code} - ${p.name} (${tail})` : `${p.code} - ${p.name}`;
};

const toOption = (p) =>
  p
    ? {
        value: p._id,
        label: buildLabel(p),
        port: p,
      }
    : null;

const PortSelect = ({
  value,
  onChange,
  countryCode = "IN",
  types,
  placeholder = "Search port by code or name…",
  isDisabled = false,
  isClearable = true,
  id,
  invalid = false,
}) => {
  const [defaultOptions, setDefaultOptions] = useState([]);
  const searchTimer = useRef(null);

  const queryParams = useMemo(() => {
    const p = {};
    if (countryCode) p.country_code = countryCode;
    if (Array.isArray(types) && types.length > 0) {
      p.types = types.join(",");
    }
    return p;
  }, [countryCode, types]);

  // Prime defaultOptions on mount + when filter changes so the dropdown
  // shows useful suggestions immediately (without forcing the operator
  // to type).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await instance.get(API_ENDPOINTS.portMaster.dropdown, {
          params: queryParams,
        });
        const rows = resp?.data?.data || [];
        if (!cancelled) setDefaultOptions(rows.map(toOption));
      } catch (_err) {
        if (!cancelled) setDefaultOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  const loadOptions = (input) =>
    new Promise((resolve) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      const term = (input || "").trim();
      // Empty / very short input → return the primed defaults so the menu
      // still shows the curated list.
      if (term.length < 1) {
        resolve(defaultOptions);
        return;
      }
      searchTimer.current = setTimeout(async () => {
        try {
          const resp = await instance.get(API_ENDPOINTS.portMaster.dropdown, {
            params: { ...queryParams, q: term },
          });
          const rows = resp?.data?.data || [];
          resolve(rows.map(toOption));
        } catch (_err) {
          resolve([]);
        }
      }, 250);
    });

  const selectedOption = toOption(value);

  return (
    <AsyncSelect
      inputId={id}
      cacheOptions={false}
      defaultOptions={defaultOptions}
      loadOptions={loadOptions}
      value={selectedOption}
      onChange={(opt) => onChange?.(opt?.port || null)}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      className={`react-select ${invalid ? "is-invalid" : ""}`}
      classNamePrefix="select"
      noOptionsMessage={({ inputValue }) =>
        inputValue
          ? `No port matches "${inputValue}"`
          : "No ports found for the current filter"
      }
    />
  );
};

PortSelect.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  countryCode: PropTypes.string,
  types: PropTypes.arrayOf(PropTypes.string),
  placeholder: PropTypes.string,
  isDisabled: PropTypes.bool,
  isClearable: PropTypes.bool,
  id: PropTypes.string,
  invalid: PropTypes.bool,
};

export default PortSelect;
