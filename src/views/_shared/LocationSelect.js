// ── LocationSelect ─────────────────────────────────────────────────
// Dropdown of the logged-in company's *locations* (physical places that
// receive shipments — warehouses, factories, branches). Used as the
// delivery-address source for PO + POV.
//
// Replaces CompanyAddressSelect for ship-to picking (2026-05-22):
// company.addresses[] is for the buyer's legal identity; locations are
// the canonical ship-to. Snapshot text is still frozen on the parent
// PO/POV at create time so downstream PDFs stay immutable.
//
// Default-selection priority:
//   1. is_default flag
//   2. first available
//
// Caller controls value via `value` / `onChange`. Auto-select happens
// once on mount when no value is provided.

import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

function pickDefault(locations = []) {
  return (
    locations.find((l) => l.is_default) ||
    locations[0] ||
    null
  );
}

const OptionLabel = ({ loc }) => {
  // List endpoint exposes `location_name`; entity uses `name`. Tolerate both.
  const name = loc?.location_name || loc?.name || "-";
  const code = loc?.location_code || loc?.code;
  const subtitle = [loc?.city, loc?.country].filter(Boolean).join(", ");
  return (
    <div className="d-flex flex-column">
      <div>
        <span className="fw-semibold me-1">{name}</span>
        {code && <small className="text-muted">[{code}]</small>}
      </div>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  );
};

const LocationSelect = ({
  value,
  onChange,
  isDisabled,
  placeholder,
  autoSelectDefault = true,
  onLocationsLoaded,
}) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    instance
      .get(API_ENDPOINTS.locations.list, { params: { perPage: 500 } })
      .then((resp) => {
        if (!mounted) return;
        const list = resp?.data?.data || [];
        const active = list.filter((l) => !l.soft_delete && !l.deleted);
        setLocations(active);
        if (onLocationsLoaded) onLocationsLoaded(active);
        if (autoSelectDefault && !value) {
          const def = pickDefault(active);
          if (def?._id && onChange) onChange(def._id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setLocations([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(
    () =>
      locations.map((l) => ({
        value: l._id,
        label: l.location_name || l.name || l.location_code || l.code || "-",
        raw: l,
      })),
    [locations]
  );

  const selected = options.find((o) => o.value === value) || null;

  return (
    <Select
      classNamePrefix="select"
      options={options}
      value={selected}
      onChange={(opt) => onChange?.(opt ? opt.value : "")}
      isDisabled={isDisabled || loading}
      isLoading={loading}
      isClearable={false}
      menuPortalTarget={document.body}
      styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
      placeholder={
        placeholder ||
        (loading
          ? t("Loading locations…")
          : locations.length === 0
          ? t("No locations on file — add one under Locations.")
          : t("Pick a delivery location"))
      }
      formatOptionLabel={(opt) => <OptionLabel loc={opt.raw} />}
    />
  );
};

export default LocationSelect;
