// Shared "Add Adjustment Note" popup. Extracted from the Adjustment Notes page
// so other screens (e.g. the POV Debit Notes tab) can open it PRE-FILLED.
//
// Props:
//   isOpen   — controlled open state
//   toggle   — close handler
//   prefill  — optional { party_type, party_id, direction, note_date, amount,
//              document_id, reason } seeded into the form when the modal opens
//   onPosted — called with the thunk result after a successful post (refresh)

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Row,
  Col,
  Input,
  Button,
  Label,
  FormFeedback,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DateInput from "@components/date-input";
import {
  useBooksClosedUpto,
  isClosedPeriod,
  closedPeriodMessage,
} from "@src/hooks/useBooksClosed";
import Notification from "@components/toast/notification";
import { currencySymbol } from "@src/views/_shared/sales-doc/_helpers";
import { createAdjustmentNote } from "./store";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PARTY_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
];

// Simple type labels (client 2026-08-03). Stored `direction` is unchanged, so
// ledger DR/CR columns, filters and exports still use debit/credit.
const EFFECT_OPTIONS = {
  customer: [
    { value: "credit", label: "Credit Note" },
    { value: "debit", label: "Debit Note" },
  ],
  vendor: [
    { value: "credit", label: "Credit Note" },
    { value: "debit", label: "Debit Note" },
  ],
};

const DEFAULTS = {
  party_type: "customer",
  party_id: "",
  party_currency: "",
  direction: "credit",
  note_date: "",
  amount: "",
  gst_rate: "",
  document_id: "",
  reason: "",
};

const AdjustmentNoteModal = ({ isOpen, toggle, prefill, onPosted }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const booksClosedUpto = useBooksClosedUpto();

  const [saving, setSaving] = useState(false);
  const [partyOptions, setPartyOptions] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [documentOptions, setDocumentOptions] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

  const loadParties = (partyType) => {
    if (!partyType) {
      setPartyOptions([]);
      return;
    }
    setLoadingParties(true);
    const url =
      partyType === "customer"
        ? API_ENDPOINTS.customers.dropdown
        : API_ENDPOINTS.vendors.dropdown;
    instance
      .get(url)
      .then((r) => {
        const rows = r?.data?.data || [];
        setPartyOptions(
          rows.map((c) => ({
            value: c._id || c.value,
            label: c.company_name || c.name || c.label,
            currency: c.currency,
          }))
        );
      })
      .catch(() => setPartyOptions([]))
      .finally(() => setLoadingParties(false));
  };

  const loadDocuments = (partyType, partyId) => {
    if (!partyType || !partyId) {
      setDocumentOptions([]);
      return;
    }
    setLoadingDocuments(true);
    instance
      .get(API_ENDPOINTS.adjustmentNotes.documents, {
        params: { party_type: partyType, party_id: partyId },
      })
      .then((r) => setDocumentOptions(r?.data?.data || []))
      .catch(() => setDocumentOptions([]))
      .finally(() => setLoadingDocuments(false));
  };

  // Seed the form from `prefill` every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const pf = prefill || {};
    setForm({
      ...DEFAULTS,
      note_date: new Date().toISOString().slice(0, 10),
      ...pf,
    });
    setErrors({});
    setDocumentOptions([]);
    loadParties(pf.party_type || "customer");
    if (pf.party_id) loadDocuments(pf.party_type || "customer", pf.party_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onPartyType = (v) => {
    setForm((s) => ({
      ...s,
      party_type: v,
      party_id: "",
      party_currency: "",
      document_id: "",
      gst_rate: v === "vendor" ? s.gst_rate : "",
    }));
    setDocumentOptions([]);
    loadParties(v);
  };

  const onParty = (partyId) => {
    setForm((s) => ({ ...s, party_id: partyId, document_id: "" }));
    loadDocuments(form.party_type, partyId);
  };

  const currencyOfSelectedParty = () => {
    if (form.party_type === "vendor") return "INR";
    const opt = partyOptions.find((o) => o.value === form.party_id);
    return opt?.currency || "";
  };

  // GST is offered only on a vendor + debit note (an INR claim back on a vendor).
  const gstEligible = form.party_type === "vendor" && form.direction === "debit";
  const gstBase = num(form.amount);
  const gstRateNum = num(form.gst_rate);
  const gstValue =
    gstEligible && gstRateNum > 0 ? Math.round(gstBase * gstRateNum) / 100 : 0;
  const gstFinal = Math.round((gstBase + gstValue) * 100) / 100;

  // Document link is REFERENCE-ONLY — it does not change the doc's balance, so
  // no over-adjust guard or "balance will change" preview here.
  const documentSelectOptions = documentOptions.map((d) => ({
    value: d._id,
    label: `${d.voucher_no}  ·  ${t("balance")} ${currencySymbol(
      d.currency_code
    )}${fmt(d.balance)}`,
  }));

  const submit = () => {
    const e = {};
    if (!form.party_id) e.party_id = t("Select a party");
    if (!form.note_date) e.note_date = t("Date required");
    else if (isClosedPeriod(form.note_date, booksClosedUpto))
      e.note_date = closedPeriodMessage(booksClosedUpto, t("note date"));
    if (!(num(form.amount) > 0)) e.amount = t("Amount must be greater than 0");
    if (!form.reason?.trim()) e.reason = t("Reason is required");
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    dispatch(
      createAdjustmentNote({
        party_type: form.party_type,
        party_id: form.party_id,
        direction: form.direction,
        note_date: form.note_date,
        amount: String(form.amount),
        ...(gstEligible && num(form.gst_rate) > 0
          ? { gst_rate: String(form.gst_rate) }
          : {}),
        ...(form.document_id ? { document_id: form.document_id } : {}),
        reason: form.reason.trim(),
      })
    )
      .then((r) => {
        if (r?.meta?.requestStatus === "fulfilled") {
          Notification(t("Success"), t("Adjustment note posted."), "success");
          onPosted?.(r);
          toggle();
        } else {
          Notification(
            t("Error"),
            r?.payload || r?.error?.message || t("Failed to post note."),
            "warning"
          );
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
      <ModalHeader toggle={toggle}>{t("Add Adjustment Note")}</ModalHeader>
      <ModalBody>
        <Row>
          <Col md="6" className="mb-2">
            <Label className="form-label">
              {t("Party Type")} <span className="text-danger">*</span>
            </Label>
            <Select
              classNamePrefix="select"
              options={PARTY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              value={
                PARTY_OPTIONS.filter((o) => o.value === form.party_type).map(
                  (o) => ({ ...o, label: t(o.label) })
                )[0] || null
              }
              onChange={(opt) => onPartyType(opt ? opt.value : "customer")}
            />
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">
              {form.party_type === "vendor" ? t("Vendor") : t("Customer")}{" "}
              <span className="text-danger">*</span>
            </Label>
            <Select
              classNamePrefix="select"
              isLoading={loadingParties}
              options={partyOptions}
              value={partyOptions.find((o) => o.value === form.party_id) || null}
              onChange={(opt) => onParty(opt ? opt.value : "")}
              placeholder={t("Select party")}
            />
            {errors.party_id && (
              <div className="text-danger small">{errors.party_id}</div>
            )}
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">
              {t("What should this note do?")}{" "}
              <span className="text-danger">*</span>
            </Label>
            <Select
              classNamePrefix="select"
              options={(EFFECT_OPTIONS[form.party_type] || []).map((o) => ({
                ...o,
                label: t(o.label),
              }))}
              value={
                (EFFECT_OPTIONS[form.party_type] || [])
                  .filter((o) => o.value === form.direction)
                  .map((o) => ({ ...o, label: t(o.label) }))[0] || null
              }
              onChange={(opt) => {
                const dir = opt ? opt.value : "credit";
                setForm((s) => ({
                  ...s,
                  direction: dir,
                  gst_rate: dir === "debit" ? s.gst_rate : "",
                }));
              }}
            />
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">
              {t("Date")} <span className="text-danger">*</span>
            </Label>
            <DateInput
              id="an-date"
              value={form.note_date}
              onChange={(_d, _s, iso) =>
                setForm((s) => ({ ...s, note_date: iso || "" }))
              }
              invalid={
                !!errors.note_date ||
                isClosedPeriod(form.note_date, booksClosedUpto)
              }
            />
            {errors.note_date ? (
              <FormFeedback className="d-block">{errors.note_date}</FormFeedback>
            ) : isClosedPeriod(form.note_date, booksClosedUpto) ? (
              <FormFeedback className="d-block">
                {closedPeriodMessage(booksClosedUpto, t("note date"))}
              </FormFeedback>
            ) : null}
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">
              {t("Amount")}
              {currencyOfSelectedParty()
                ? ` (${currencySymbol(currencyOfSelectedParty())} ${currencyOfSelectedParty()})`
                : ""}{" "}
              <span className="text-danger">*</span>
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={form.amount}
              onChange={(e) =>
                setForm((s) => ({ ...s, amount: e.target.value }))
              }
              invalid={!!errors.amount}
            />
            {errors.amount && (
              <FormFeedback className="d-block">{errors.amount}</FormFeedback>
            )}
          </Col>

          {gstEligible && (
            <Col md="6" className="mb-2">
              <Label className="form-label">{t("GST Rate (%)")}</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                placeholder={t("e.g. 12")}
                value={form.gst_rate}
                onChange={(e) =>
                  setForm((s) => ({ ...s, gst_rate: e.target.value }))
                }
              />
              <div className="d-flex justify-content-between small text-muted mt-50">
                <span>
                  {t("GST Value")}: {currencySymbol("INR")}
                  {fmt(gstValue)}
                </span>
                <span className="fw-semibold text-dark">
                  {t("Final Amount")}: {currencySymbol("INR")}
                  {fmt(gstFinal)}
                </span>
              </div>
            </Col>
          )}
          <Col md="12" className="mb-2">
            <Label className="form-label">
              {form.party_type === "vendor"
                ? t("Apply to Vendor PO")
                : t("Apply to Invoice")}{" "}
              <span className="text-muted small">({t("optional")})</span>
            </Label>
            <Select
              classNamePrefix="select"
              isClearable
              isLoading={loadingDocuments}
              isDisabled={!form.party_id}
              options={documentSelectOptions}
              value={
                documentSelectOptions.find(
                  (o) => o.value === form.document_id
                ) || null
              }
              onChange={(opt) =>
                setForm((s) => ({ ...s, document_id: opt ? opt.value : "" }))
              }
              placeholder={
                !form.party_id
                  ? t("Select a party first")
                  : documentSelectOptions.length
                    ? t("None — apply to the whole party")
                    : t("No open documents for this party")
              }
            />
            <div className="text-muted small mt-25">
              {t(
                "Optional reference link. It does NOT change that document's balance — the note posts to the party ledger only."
              )}
            </div>
          </Col>

          <Col md="12" className="mb-2">
            <Label className="form-label">
              {t("Reason")} <span className="text-danger">*</span>
            </Label>
            <Input
              type="textarea"
              rows="3"
              value={form.reason}
              placeholder={t(
                "Reason / reference — e.g. goodwill credit vs INV STIPL119"
              )}
              onChange={(e) =>
                setForm((s) => ({ ...s, reason: e.target.value }))
              }
              invalid={!!errors.reason}
            />
            {errors.reason && (
              <FormFeedback className="d-block">{errors.reason}</FormFeedback>
            )}
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle}>
          {t("Cancel")}
        </Button>
        <Button color="primary" onClick={submit} disabled={saving}>
          {t("Post")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AdjustmentNoteModal;
