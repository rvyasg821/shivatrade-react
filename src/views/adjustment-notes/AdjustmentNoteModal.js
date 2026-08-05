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
import { Plus, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DateInput from "@components/date-input";
import EntitySearchSelect from "@components/entity-select";
import {
  useBooksClosedUpto,
  isClosedPeriod,
  closedPeriodMessage,
} from "@src/hooks/useBooksClosed";
import Notification from "@components/toast/notification";
import { currencySymbol } from "@src/views/_shared/sales-doc/_helpers";
import { createAdjustmentNotesBatch } from "./store";

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

const emptyLine = () => ({ document_id: "", amount: "", gst_rate: "" });

const DEFAULTS = {
  party_type: "customer",
  party_id: "",
  party_name: "",
  party_currency: "",
  direction: "credit",
  note_date: "",
  // One (document, amount, gst%) allocation per row — each posts its own note.
  lines: [emptyLine()],
  reason: "",
};

const AdjustmentNoteModal = ({ isOpen, toggle, prefill, onPosted }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const booksClosedUpto = useBooksClosedUpto();

  const [saving, setSaving] = useState(false);
  const [documentOptions, setDocumentOptions] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

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

  // Seed the form from `prefill` every time the modal opens. A single-note
  // prefill (amount + document_id) becomes the first allocation row.
  useEffect(() => {
    if (!isOpen) return;
    const {
      amount: pfAmount,
      document_id: pfDoc,
      gst_rate: pfGst,
      ...pfRest
    } = prefill || {};
    setForm({
      ...DEFAULTS,
      note_date: new Date().toISOString().slice(0, 10),
      ...pfRest,
      lines: [
        {
          document_id: pfDoc || "",
          amount: pfAmount != null ? String(pfAmount) : "",
          gst_rate: pfGst != null ? String(pfGst) : "",
        },
      ],
    });
    setErrors({});
    setDocumentOptions([]);
    if (pfRest.party_id)
      loadDocuments(pfRest.party_type || "customer", pfRest.party_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onPartyType = (v) => {
    setForm((s) => ({
      ...s,
      party_type: v,
      party_id: "",
      party_name: "",
      party_currency: "",
      // Different party → clear the doc dropdowns (amounts kept). GST only
      // applies to a vendor + debit note, so drop per-row rates for a customer.
      lines: s.lines.map((l) => ({
        ...l,
        document_id: "",
        gst_rate: v === "vendor" ? l.gst_rate : "",
      })),
    }));
    setDocumentOptions([]);
  };

  // opt = react-select option from <EntitySearchSelect> (.raw = full row).
  const onParty = (opt) => {
    const partyId = opt?.value || "";
    setForm((s) => ({
      ...s,
      party_id: partyId,
      party_name: opt?.label || "",
      party_currency:
        s.party_type === "vendor" ? "INR" : opt?.raw?.currency || "",
      lines: s.lines.map((l) => ({ ...l, document_id: "" })),
    }));
    if (partyId) loadDocuments(form.party_type, partyId);
    else setDocumentOptions([]);
  };

  const addLine = () =>
    setForm((s) => ({ ...s, lines: [...s.lines, emptyLine()] }));
  const removeLine = (idx) =>
    setForm((s) => ({
      ...s,
      lines:
        s.lines.length > 1 ? s.lines.filter((_, i) => i !== idx) : s.lines,
    }));
  const updateLine = (idx, patch) =>
    setForm((s) => ({
      ...s,
      lines: s.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));

  const currencyOfSelectedParty = () =>
    form.party_type === "vendor" ? "INR" : form.party_currency || "";

  // GST is offered only on a vendor + debit note (an INR claim back on a vendor),
  // and is now entered PER ROW (each note stores its own rate).
  const gstEligible = form.party_type === "vendor" && form.direction === "debit";
  const lineGst = (l) => {
    const rate = num(l.gst_rate);
    return gstEligible && rate > 0
      ? Math.round(num(l.amount) * rate) / 100
      : 0;
  };
  const linesTotal = form.lines.reduce((sum, l) => sum + num(l.amount), 0);
  const gstTotal = form.lines.reduce((sum, l) => sum + lineGst(l), 0);
  const grandTotal = Math.round((linesTotal + gstTotal) * 100) / 100;

  // Document link is REFERENCE-ONLY — it does not change the doc's balance, so
  // no over-adjust guard or "balance will change" preview here.
  const documentSelectOptions = documentOptions.map((d) => ({
    value: d._id,
    label: `${d.voucher_no}  ·  ${t("balance")} ${currencySymbol(
      d.currency_code
    )}${fmt(d.balance)}`,
  }));

  // A document may be referenced by only ONE row. Each row's dropdown hides the
  // documents already chosen in the OTHER rows (its own pick stays visible).
  // Party-level rows (no document) can repeat freely.
  const usedDocIds = form.lines.map((l) => l.document_id).filter(Boolean);
  const optionsForRow = (idx) =>
    documentSelectOptions.filter(
      (o) =>
        o.value === form.lines[idx].document_id ||
        !usedDocIds.includes(o.value)
    );

  const submit = () => {
    const e = {};
    if (!form.party_id) e.party_id = t("Select a party");
    if (!form.note_date) e.note_date = t("Date required");
    else if (isClosedPeriod(form.note_date, booksClosedUpto))
      e.note_date = closedPeriodMessage(booksClosedUpto, t("note date"));
    // Rows with a positive amount are the notes we post; blank rows are ignored.
    const validLines = form.lines.filter((l) => num(l.amount) > 0);
    if (form.lines.some((l) => l.amount !== "" && !(num(l.amount) > 0)))
      e.lines = t("Each amount must be greater than 0");
    else if (!validLines.length)
      e.lines = t("Add at least one amount greater than 0");
    else {
      // Same invoice/PO can't appear on two rows.
      const docIds = validLines.map((l) => l.document_id).filter(Boolean);
      if (new Set(docIds).size !== docIds.length)
        e.lines = t("The same document can't be used on two rows.");
    }
    if (!form.reason?.trim()) e.reason = t("Reason is required");
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    dispatch(
      createAdjustmentNotesBatch({
        party_type: form.party_type,
        party_id: form.party_id,
        direction: form.direction,
        note_date: form.note_date,
        reason: form.reason.trim(),
        lines: validLines.map((l) => ({
          amount: String(l.amount),
          ...(gstEligible && num(l.gst_rate) > 0
            ? { gst_rate: String(l.gst_rate) }
            : {}),
          ...(l.document_id ? { document_id: l.document_id } : {}),
        })),
      })
    )
      .then((r) => {
        if (r?.meta?.requestStatus === "fulfilled") {
          Notification(
            t("Success"),
            validLines.length > 1
              ? t("{{n}} adjustment notes posted.", { n: validLines.length })
              : t("Adjustment note posted."),
            "success"
          );
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
            {/* Server-side searchable — shows the first 10, then searches as
                you type (kind switches with Party Type). */}
            <EntitySearchSelect
              key={form.party_type}
              kind={form.party_type}
              value={
                form.party_id
                  ? { value: form.party_id, label: form.party_name }
                  : null
              }
              onChange={onParty}
              placeholder={t("Search & select party")}
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
                  lines: s.lines.map((l) => ({
                    ...l,
                    gst_rate: dir === "debit" ? l.gst_rate : "",
                  })),
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
          <Col md="12" className="mb-1">
            <Label className="form-label d-block">
              {form.party_type === "vendor"
                ? t("Apply to Vendor POs")
                : t("Apply to Invoices")}{" "}
              <span className="text-danger">*</span>
            </Label>
            {/* Column captions */}
            <Row className="g-1 mb-25 small text-muted d-none d-sm-flex">
              <Col xs={gstEligible ? "5" : "7"}>
                {form.party_type === "vendor" ? t("Vendor PO") : t("Invoice")}
              </Col>
              <Col xs={gstEligible ? "3" : "4"}>
                {t("Amount")}
                {currencyOfSelectedParty()
                  ? ` (${currencySymbol(currencyOfSelectedParty())})`
                  : ""}
              </Col>
              {gstEligible && <Col xs="3">{t("GST %")}</Col>}
              <Col xs="1" />
            </Row>
            {form.lines.map((line, idx) => (
              <Row className="g-1 align-items-center mb-1" key={idx}>
                <Col xs={gstEligible ? "5" : "7"}>
                  <Select
                    classNamePrefix="select"
                    isClearable
                    isLoading={loadingDocuments}
                    isDisabled={!form.party_id}
                    options={optionsForRow(idx)}
                    value={
                      documentSelectOptions.find(
                        (o) => o.value === line.document_id
                      ) || null
                    }
                    onChange={(opt) =>
                      updateLine(idx, { document_id: opt ? opt.value : "" })
                    }
                    placeholder={
                      !form.party_id
                        ? t("Select a party first")
                        : documentSelectOptions.length
                          ? t("None — whole party")
                          : t("No open documents")
                    }
                  />
                </Col>
                <Col xs={gstEligible ? "3" : "4"}>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) =>
                      updateLine(idx, { amount: e.target.value })
                    }
                  />
                </Col>
                {gstEligible && (
                  <Col xs="3">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder={t("e.g. 12")}
                      value={line.gst_rate}
                      onChange={(e) =>
                        updateLine(idx, { gst_rate: e.target.value })
                      }
                    />
                  </Col>
                )}
                <Col xs="1" className="text-center px-0">
                  <Button
                    color="flat-danger"
                    className="btn-icon p-25"
                    onClick={() => removeLine(idx)}
                    disabled={form.lines.length === 1}
                    title={t("Remove")}
                  >
                    <Trash2 size={16} />
                  </Button>
                </Col>
              </Row>
            ))}
            {errors.lines && (
              <div className="text-danger small">{errors.lines}</div>
            )}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mt-1">
              <Button
                color="flat-primary"
                size="sm"
                onClick={addLine}
                disabled={!form.party_id}
              >
                <Plus size={14} className="me-25" />
                {t("Add document")}
              </Button>
              <div className="text-end small">
                <span className="fw-semibold">
                  {t("Total")}:{" "}
                  {currencySymbol(currencyOfSelectedParty() || "INR")}
                  {fmt(linesTotal)}
                </span>
                {gstEligible && gstTotal > 0 && (
                  <>
                    <span className="text-muted ms-2">
                      + {t("GST")} {currencySymbol("INR")}
                      {fmt(gstTotal)}
                    </span>
                    <span className="fw-bolder text-dark ms-2">
                      = {currencySymbol("INR")}
                      {fmt(grandTotal)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-muted small mt-25">
              {t(
                "Each row posts a separate note to the party ledger. The document link is a reference only — it does NOT change that document's balance."
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
