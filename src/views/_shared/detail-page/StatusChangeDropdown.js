// Shared "Change Status" dropdown for detail pages (RFQ, Quotation, …) so the
// status-transition control looks + behaves identically everywhere.
//
// items: [{ key, label, icon?, dotColor?, current?, disabled?, onClick }]
//   - icon     : a react-feather icon component (Quotation-style action items)
//   - dotColor : bootstrap color name → coloured status dot (RFQ-style list)
//   - current  : marks the active status (bold + check, disabled)

import {
  UncontrolledButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import { Check } from "react-feather";
import { useTranslation } from "react-i18next";

const StatusChangeDropdown = ({
  items = [],
  label,
  toggleColor = "primary",
  size = "sm",
  menuEnd = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <UncontrolledButtonDropdown>
      <DropdownToggle color={toggleColor} size={size} caret disabled={disabled}>
        {label || t("Change Status")}
      </DropdownToggle>
      <DropdownMenu end={menuEnd} className="status-change-menu">
        <DropdownItem header className="text-uppercase small">
          {t("Set status")}
        </DropdownItem>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <DropdownItem
              key={it.key || it.label}
              className={`text-capitalize${it.current ? " fw-bold" : ""}`}
              disabled={it.disabled || it.current}
              onClick={it.onClick}
            >
              {it.dotColor ? (
                <span
                  className={`bg-${it.dotColor} rounded-circle d-inline-block me-50`}
                  style={{ width: 8, height: 8 }}
                />
              ) : null}
              {Icon ? <Icon size={14} className="me-50" /> : null}
              {it.label}
              {it.current ? <Check size={14} className="ms-auto" /> : null}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </UncontrolledButtonDropdown>
  );
};

export default StatusChangeDropdown;
