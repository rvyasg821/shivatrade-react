// ── CompanyAddressSelect ────────────────────────────────────────────
// Dropdown of the logged-in company's addresses (corporate / warehouse
// / branch / other). Used in:
//   - Generate POs modal (one per batch)
//   - PO wizard Step 1 (per PO)
//   - POV create modal (per POV, after Addendum 5 ships)
//
// Source: GET /admin/company/my-company → addresses[].
// Default-selection priority (matches Addendum 5 of
// PO_DELIVERY_ADDRESS_REFACTOR_PLAN):
//   1. warehouse + is_default
//   2. first warehouse
//   3. corporate + is_default
//   4. first corporate
//   5. first available
//
// Caller controls value via `value` / `onChange`. Auto-select happens
// once on mount when no value is provided.

import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Badge } from "reactstrap";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const TYPE_BADGE = {
  warehouse: "info",
  corporate: "primary",
  branch: "secondary",
  other: "secondary",
};

function pickDefault(addresses = []) {
  return (
    addresses.find((a) => a.type === "warehouse" && a.is_default) ||
    addresses.find((a) => a.type === "warehouse") ||
    addresses.find((a) => a.type === "corporate" && a.is_default) ||
    addresses.find((a) => a.type === "corporate") ||
    addresses[0] ||
    null
  );
}

const OptionLabel = ({ addr }) => {
  const subtitle = [addr?.city, addr?.country].filter(Boolean).join(", ");
  const color = TYPE_BADGE[addr?.type] || "secondary";
  return (
    <div className="d-flex flex-column">
      <div className="d-flex align-items-center">
        <span className="fw-semibold me-1">
          {addr?.label || (addr?.type || "").toUpperCase()}
        </span>
        <Badge color={`light-${color}`} className="text-capitalize">
          {addr?.type || "-"}
        </Badge>
      </div>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  );
};

const CompanyAddressSelect = ({
  value,
  onChange,
  isDisabled,
  placeholder,
  autoSelectDefault = true,
  onAddressesLoaded,
}) => {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    instance
      .get(API_ENDPOINTS.company.list)
      .then((resp) => {
        if (!mounted) return;
        const list = resp?.data?.data?.addresses || [];
        const active = list.filter((a) => !a.soft_delete);
        setAddresses(active);
        if (onAddressesLoaded) onAddressesLoaded(active);
        // Auto-select on first load only if caller hasn't picked yet.
        if (autoSelectDefault && !value) {
          const def = pickDefault(active);
          if (def?._id && onChange) onChange(def._id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setAddresses([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(
    () =>
      addresses.map((a) => ({
        value: a._id,
        label: a.label || `${(a.type || "").toUpperCase()} · ${a.city || ""}`,
        raw: a,
      })),
    [addresses]
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
          ? t("Loading company addresses…")
          : addresses.length === 0
          ? t("No company addresses on file")
          : t("Pick a company address"))
      }
      formatOptionLabel={(opt) => <OptionLabel addr={opt.raw} />}
    />
  );
};

export default CompanyAddressSelect;
