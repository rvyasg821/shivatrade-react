// MultiSoPickerModal — customer-first multi-SO line picker.
//
// Shared by two entry points (SHIPPING_INVOICE_MERGE_PLAN §5b):
//   1. Invoice listing "Create Invoice" — no customer locked yet; the
//      operator picks a customer, then ticks invoiceable lines across that
//      customer's confirmed SOs (grouped by SO).
//   2. Wizard "+ Add items from another SO" — customer + currency + country
//      already locked by the in-progress invoice; non-matching SOs disabled.
//
// Invariant: one invoice = one customer + one currency + one country. The
// first SO with a ticked line sets the "active key" (currency|country); SOs
// that don't match are disabled with a hint.

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Input,
  Badge,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// GSTR-1 UQC fallback (mirrors the add form's mapUomToUqc).
const mapUomToUqc = (unit) => {
  const u = (unit || "").trim().toUpperCase();
  const map = {
    KG: "KGS",
    KGS: "KGS",
    NOS: "NOS",
    PIECE: "PCS",
    PCS: "PCS",
    PACK: "PAC",
    BOX: "BOX",
    LITRE: "LTR",
    LTR: "LTR",
    ML: "MLT",
    METER: "MTR",
    MTR: "MTR",
    SET: "SET",
  };
  return map[u] || "OTH";
};

const groupKey = (g) =>
  `${(g.currency_code || "").toUpperCase()}|${(g.country_of_destination || "")
    .trim()
    .toLowerCase()}`;

const MultiSoPickerModal = ({
  isOpen,
  toggle,
  customerId: lockedCustomerId,
  lockCurrency,
  lockCountry,
  excludeInvoiceId,
  existingPoLineIds = [],
  onConfirm,
}) => {
  const { t } = useTranslation();

  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerId, setCustomerId] = useState(lockedCustomerId || "");
  const [rawGroups, setRawGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  // picks: { [po_line_id]: { selected, qty } }
  const [picks, setPicks] = useState({});

  const customerLocked = !!lockedCustomerId;
  const existing = useMemo(
    () => new Set((existingPoLineIds || []).map(String)),
    [existingPoLineIds]
  );

  // Load customer dropdown only when the picker has to ask (listing flow).
  useEffect(() => {
    if (!isOpen || customerLocked) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await instance.get(API_ENDPOINTS.customers.dropdown);
        const rows = resp?.data?.data || [];
        if (!cancelled) {
          setCustomerOptions(
            rows.map((c) => ({
              value: c._id,
              label: c.company_name || c.name || c._id,
            }))
          );
        }
      } catch {
        if (!cancelled) setCustomerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerLocked]);

  // Reset on open; honour the locked customer.
  useEffect(() => {
    if (isOpen) {
      setCustomerId(lockedCustomerId || "");
      setRawGroups([]);
      setPicks({});
    }
  }, [isOpen, lockedCustomerId]);

  // Fetch invoiceable SO groups for the chosen customer. Deps are stable
  // (no `existing` here — that filter is applied at render via useMemo, so a
  // fresh existingPoLineIds array from the parent never re-triggers a fetch).
  useEffect(() => {
    if (!isOpen || !customerId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = excludeInvoiceId
          ? { exclude_invoice_id: excludeInvoiceId }
          : {};
        const resp = await instance.get(
          `${API_ENDPOINTS.invoices.customerInvoiceable}/${customerId}`,
          { params }
        );
        const raw = resp?.data?.data || [];
        if (!cancelled) {
          setRawGroups(raw);
          const init = {};
          raw.forEach((g) =>
            (g.lines || []).forEach((l) => {
              init[l.purchase_order_line_id] = {
                selected: false,
                qty: l.available,
              };
            })
          );
          setPicks(init);
        }
      } catch {
        if (!cancelled) setRawGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, excludeInvoiceId]);

  // Displayed groups = raw minus lines already on the in-progress draft;
  // empty groups dropped. Pure derivation — never triggers a re-fetch.
  const groups = useMemo(
    () =>
      rawGroups
        .map((g) => ({
          ...g,
          lines: (g.lines || []).filter(
            (l) => !existing.has(String(l.purchase_order_line_id))
          ),
        }))
        .filter((g) => g.lines.length > 0),
    [rawGroups, existing]
  );

  // Active key: from the wizard lock if provided, else from the first group
  // that has any selected line. Groups whose key differs are disabled.
  const activeKey = useMemo(() => {
    if (lockCurrency || lockCountry) {
      return `${(lockCurrency || "").toUpperCase()}|${(lockCountry || "")
        .trim()
        .toLowerCase()}`;
    }
    for (const g of groups) {
      const anySelected = g.lines.some(
        (l) => picks[l.purchase_order_line_id]?.selected
      );
      if (anySelected) return groupKey(g);
    }
    return null;
  }, [groups, picks, lockCurrency, lockCountry]);

  const isGroupEnabled = (g) => !activeKey || groupKey(g) === activeKey;

  const togglePick = (poLineId) =>
    setPicks((p) => ({
      ...p,
      [poLineId]: { ...p[poLineId], selected: !p[poLineId]?.selected },
    }));
  const setQty = (poLineId, qty) =>
    setPicks((p) => ({ ...p, [poLineId]: { ...p[poLineId], qty } }));

  const selectedCount = Object.values(picks).filter((p) => p?.selected).length;

  const handleConfirm = () => {
    const out = [];
    let chosen = null;
    for (const g of groups) {
      if (!isGroupEnabled(g)) continue;
      for (const l of g.lines) {
        const pick = picks[l.purchase_order_line_id];
        if (!pick?.selected) continue;
        const qty = Number(pick.qty || 0);
        if (qty <= 0) continue;
        if (!chosen) {
          chosen = {
            customer_id: customerId,
            currency_code: g.currency_code || "",
            country_of_destination: g.country_of_destination || "",
          };
        }
        out.push({
          purchase_order_id: g.po_id,
          purchase_order_line_id: l.purchase_order_line_id,
          po_vendor_line_id: undefined,
          product_id: l.product_id,
          product_name: l.product_name || "",
          product_code: l.product_code || "",
          description: l.product_name || "",
          hsn_code: l.hsn_code || "",
          customer_reference: l.customer_reference || "",
          unit: l.unit || "Nos",
          uqc_code: mapUomToUqc(l.unit),
          qty: String(qty),
          unit_price: String(l.unit_price || 0),
          discount_pct: "0",
          tax_pct: "0",
          igst_rate_pct: String(l.tax_pct || 0),
          product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
            ? l.product_rebates_snapshot
            : [],
          product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
            ? l.product_expenses_snapshot
            : [],
          // Packing carried from the SO line (originally from quotation).
          packages: l.package_count != null ? String(l.package_count) : "",
          net_weight: l.net_weight_kg != null ? String(l.net_weight_kg) : "",
          gross_weight:
            l.gross_weight_kg != null ? String(l.gross_weight_kg) : "",
        });
      }
    }
    if (!out.length) return;
    onConfirm(out, chosen);
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>{t("Select Sales Order lines")}</ModalHeader>
      <ModalBody>
        {!customerLocked && (
          <div className="mb-2">
            <label className="form-label">{t("Customer")}</label>
            <Select
              classNamePrefix="select"
              isClearable
              options={customerOptions}
              value={
                customerOptions.find((o) => o.value === customerId) || null
              }
              onChange={(opt) => setCustomerId(opt ? opt.value : "")}
              placeholder={t("Pick a customer")}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-3">
            <Spinner size="sm" /> {t("Loading invoiceable SOs…")}
          </div>
        ) : !customerId ? (
          <div className="text-muted small py-2">
            {t("Pick a customer to see their invoiceable Sales Orders.")}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-muted small py-2">
            {t("No invoiceable (dispatched) SO lines for this customer.")}
          </div>
        ) : (
          groups.map((g) => {
            const enabled = isGroupEnabled(g);
            return (
              <div
                key={g.po_id}
                className={`border rounded p-2 mb-2 ${
                  enabled ? "" : "bg-light opacity-50"
                }`}
              >
                <div className="d-flex flex-wrap align-items-center gap-1 mb-1">
                  <strong>{g.po_voucher_no || g.po_id}</strong>
                  {g.quotation_voucher_no && (
                    <span className="text-muted small">
                      · {t("Quote")} {g.quotation_voucher_no}
                    </span>
                  )}
                  {g.buyer_reference && (
                    <span className="text-muted small">
                      · {t("Req")} {g.buyer_reference}
                    </span>
                  )}
                  <Badge color="light-secondary" className="ms-1">
                    {g.currency_code || "—"}
                  </Badge>
                  {g.country_of_destination && (
                    <Badge color="light-secondary">
                      {g.country_of_destination}
                    </Badge>
                  )}
                  {!enabled && (
                    <span className="text-danger small ms-auto">
                      {t("Different currency/country — not combinable")}
                    </span>
                  )}
                </div>
                {g.lines.map((l) => {
                  const pk = picks[l.purchase_order_line_id] || {};
                  return (
                    <div
                      key={l.purchase_order_line_id}
                      className="d-flex align-items-center gap-1 py-25"
                    >
                      <Input
                        type="checkbox"
                        className="me-1"
                        disabled={!enabled}
                        checked={!!pk.selected}
                        onChange={() =>
                          togglePick(l.purchase_order_line_id)
                        }
                      />
                      <span className="flex-grow-1">
                        {l.product_code ? (
                          <code className="me-1">{l.product_code}</code>
                        ) : null}
                        {l.product_name}
                      </span>
                      <span className="text-muted small me-1">
                        {t("avail")} {l.available}
                      </span>
                      <Input
                        type="number"
                        bsSize="sm"
                        min="0"
                        step="0.01"
                        style={{ width: 90 }}
                        disabled={!enabled || !pk.selected}
                        value={pk.qty ?? ""}
                        onChange={(e) =>
                          setQty(l.purchase_order_line_id, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
        >
          {t("Add")} {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

MultiSoPickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  customerId: PropTypes.string,
  lockCurrency: PropTypes.string,
  lockCountry: PropTypes.string,
  excludeInvoiceId: PropTypes.string,
  existingPoLineIds: PropTypes.array,
  onConfirm: PropTypes.func.isRequired,
};

export default MultiSoPickerModal;
