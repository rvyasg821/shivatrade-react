import { Fragment, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, Link } from "react-router-dom";
import {
  Card,
  CardBody,
  Row,
  Col,
  Input,
  Button,
  Badge,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormFeedback,
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
} from "reactstrap";
import Select from "react-select";
import { PlusCircle, Eye } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { useBooksClosedUpto, isClosedPeriod, closedPeriodMessage } from "@src/hooks/useBooksClosed";
import Notification from "@components/toast/notification";
import { defaultPerPageRow, isAdminUser, appsRoot } from "@constant/defaultValues";
import { currencySymbol } from "@src/views/_shared/sales-doc/_helpers";
import {
  getAdjustmentNoteList,
  createAdjustmentNote,
  voidAdjustmentNote,
  cleanAdjustmentNoteMessage,
} from "./store";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// Display dates as DD-MM-YYYY (stored/sent as YYYY-MM-DD).
const dateOnly = (v) => {
  const s = String(v || "").slice(0, 10);
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}-${m}-${y}` : "-";
};

const PARTY_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
];
// Filter dropdown — plain debit/credit, matching the DR/CR ledger columns.
const DIRECTION_OPTIONS = [
  { value: "debit", label: "Debit (DR)" },
  { value: "credit", label: "Credit (CR)" },
];

/**
 * The SAME two values, worded by what they do to the balance — because the
 * accounting names invert between the two sides and nobody remembers which:
 *
 *   Customer → Credit note reduces what they owe, Debit note increases it.
 *   Vendor   → Debit note reduces what we owe,   Credit note increases it.
 *
 * The stored `direction` is unchanged; only the label differs, so ledgers,
 * exports and existing notes are untouched.
 */
const EFFECT_OPTIONS = {
  customer: [
    {
      value: "credit",
      label: "Reduce the bill — customer owes less (Credit Note)",
    },
    {
      value: "debit",
      label: "Increase the bill — customer owes more (Debit Note)",
    },
  ],
  vendor: [
    { value: "debit", label: "Reduce the bill — we owe less (Debit Note)" },
    { value: "credit", label: "Increase the bill — we owe more (Credit Note)" },
  ],
};
/** True when this party/direction pair lowers the document's balance. */
const reducesBalance = (partyType, direction) =>
  partyType === "customer" ? direction === "credit" : direction === "debit";
// The list is a register of every party money-movement, not just notes.
const SOURCE_LABELS = {
  adjustment: "Adjustment Note",
  receipt: "Customer Receipt",
  payment: "Vendor Payment",
};

const AdjustmentNotes = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const booksClosedUpto = useBooksClosedUpto();
  const mySwal = withReactContent(Swal);
  const store = useSelector((s) => s.adjustmentNote);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["adjustment-notes"];
  const canAdd = isAdmin || perms?.can_all || perms?.can_add;
  const canVoid = isAdmin || perms?.can_all || perms?.can_update;

  // Deep-link from a customer/vendor Ledger tab: ?party_type=…&party_id=…
  const [searchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState(
    searchParams.get("party_type") || ""
  );
  const [directionFilter, setDirectionFilter] = useState("");
  // Party filter — a single dropdown whose options follow the Party Type
  // above it (customers or vendors), with an "All" entry.
  const [partyIdFilter, setPartyIdFilter] = useState(
    searchParams.get("party_id") || ""
  );
  const [customerOptions, setCustomerOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);

  const partyFilterOptions =
    partyTypeFilter === "customer"
      ? customerOptions
      : partyTypeFilter === "vendor"
      ? vendorOptions
      : [];
  const allPartyOption = {
    value: "",
    label: partyTypeFilter === "vendor" ? t("All vendors") : t("All customers"),
  };

  const handleLists = useCallback(
    (page = currentPage, perPage = rowsPerPage) => {
      dispatch(
        getAdjustmentNoteList({
          page,
          perPage,
          search: searchInput || undefined,
          party_type: partyTypeFilter || undefined,
          party_id: partyIdFilter || undefined,
          direction: directionFilter || undefined,
        })
      );
    },
    [
      currentPage,
      rowsPerPage,
      searchInput,
      partyTypeFilter,
      partyIdFilter,
      directionFilter,
      dispatch,
    ]
  );

  const handlePagination = (page) => {
    setCurrentPage(page + 1);
    handleLists(page + 1, rowsPerPage);
  };
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleLists(1, value);
  };

  useEffect(() => {
    const h = setTimeout(() => {
      setCurrentPage(1);
      handleLists(1, rowsPerPage);
    }, searchInput ? 400 : 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, partyTypeFilter, partyIdFilter, directionFilter]);

  // Filter dropdown sources (loaded once).
  useEffect(() => {
    const map = (rows) =>
      (rows || []).map((c) => ({
        value: c._id || c.value,
        label: c.company_name || c.name || c.label,
      }));
    instance
      .get(API_ENDPOINTS.customers.dropdown)
      .then((r) => setCustomerOptions(map(r?.data?.data)))
      .catch(() => setCustomerOptions([]));
    instance
      .get(API_ENDPOINTS.vendors.dropdown)
      .then((r) => setVendorOptions(map(r?.data?.data)))
      .catch(() => setVendorOptions([]));
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      if (store?.success) Notification(t("Success"), store.success, "success");
      if (store?.error) Notification(t("Error"), store.error, "warning");
      if (store?.actionFlag === "AN_CRTD" || store?.actionFlag === "AN_VOID") {
        handleLists();
      }
      dispatch(cleanAdjustmentNoteMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  // ── Add modal ──
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partyOptions, setPartyOptions] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  // Invoices / Vendor POs the note can be applied to (optional link).
  const [documentOptions, setDocumentOptions] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // ── View drawer (right-side) ──
  const [viewNote, setViewNote] = useState(null);

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

  /**
   * Documents the note may be applied to. Loaded per party — an empty list is
   * fine (the link is optional and the note stays party-level).
   */
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

  const openModal = () => {
    setForm({
      party_type: "customer",
      party_id: "",
      party_currency: "",
      direction: "credit",
      note_date: new Date().toISOString().slice(0, 10),
      amount: "",
      gst_rate: "",
      document_id: "",
      reason: "",
    });
    setErrors({});
    setDocumentOptions([]);
    loadParties("customer");
    setOpen(true);
  };

  const onPartyType = (v) => {
    // GST is a vendor+debit-only field — drop any rate if we leave that combo.
    // Party change invalidates both the party and any document already picked.
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

  const submit = () => {
    const e = {};
    if (!form.party_id) e.party_id = t("Select a party");
    if (!form.note_date) e.note_date = t("Date required");
    else if (isClosedPeriod(form.note_date, booksClosedUpto))
      e.note_date = closedPeriodMessage(booksClosedUpto, t("note date"));
    if (!(num(form.amount) > 0)) e.amount = t("Amount must be greater than 0");
    if (!form.reason?.trim()) e.reason = t("Reason is required");
    // Mirror the server guard so the user sees it before the round-trip: a
    // "reduce the bill" note can't exceed what the document still owes.
    if (selectedDocument && willReduce && gstFinalAmount - num(selectedDocument.balance) > 0.01) {
      e.document_id = t(
        "This is more than the outstanding balance on that document"
      );
    }
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
        // GST honoured server-side only for vendor + debit; send when set.
        ...(gstEligible && num(form.gst_rate) > 0
          ? { gst_rate: String(form.gst_rate) }
          : {}),
        // Optional link — omitted entirely for a party-level note.
        ...(form.document_id ? { document_id: form.document_id } : {}),
        reason: form.reason.trim(),
      })
    )
      .then((r) => {
        if (r?.meta?.requestStatus === "fulfilled") setOpen(false);
      })
      .finally(() => setSaving(false));
  };

  const handleVoid = (row) => {
    const isNote = row?.source === "adjustment";
    mySwal
      .fire({
        title: isNote
          ? t("Void this adjustment note?")
          : row?.source === "receipt"
          ? t("Void this customer receipt?")
          : t("Void this vendor payment?"),
        text: t("It stays in the audit log but is removed from the ledger."),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, void"),
        cancelButtonText: t("Back"),
        customClass: {
          confirmButton: "btn btn-warning",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (res) => {
        if (!res.isConfirmed) return;
        const reason = res.value || undefined;
        // Adjustment notes are owned by this register (redux thunk). Customer
        // receipts and vendor payments are voided through their document's own
        // endpoint (invoice / Vendor PO), then the list is refreshed.
        if (isNote) {
          dispatch(voidAdjustmentNote({ id: row._id, reason }));
          return;
        }
        if (!row?.document_id) {
          Notification(
            "Error",
            t("Missing linked document — cannot void this entry."),
            "warning"
          );
          return;
        }
        const url =
          row.source === "receipt"
            ? `${API_ENDPOINTS.invoices.voidPayment}/${row.document_id}/void/${row._id}`
            : `${API_ENDPOINTS.poVendors.payments}/${row.document_id}/void/${row._id}`;
        try {
          await instance.post(url, { reason });
          Notification("Success", t("Voided successfully"), "success");
          handleLists();
        } catch (e) {
          Notification(
            "Error",
            e?.response?.data?.message || t("Failed to void"),
            "warning"
          );
        }
      });
  };

  const currencyOfSelectedParty = () => {
    if (form.party_type === "vendor") return "INR";
    const opt = partyOptions.find((o) => o.value === form.party_id);
    return opt?.currency || "";
  };

  // GST is offered only on a vendor + debit note (an INR claim back on a
  // vendor). gst_value = round2(amount × rate / 100); final = amount + gst.
  const gstEligible = form.party_type === "vendor" && form.direction === "debit";
  const gstBase = num(form.amount);
  const gstRateNum = num(form.gst_rate);
  const gstValue =
    gstEligible && gstRateNum > 0 ? Math.round(gstBase * gstRateNum) / 100 : 0;
  const gstFinal = Math.round((gstBase + gstValue) * 100) / 100;

  // ── "Apply to document" preview ──
  // The money that actually posts (base + GST), the picked document, and what
  // its balance becomes — so the user sees "$100.00 → $65.00" before saving.
  const gstFinalAmount = gstEligible ? gstFinal : gstBase;
  const selectedDocument =
    documentOptions.find((d) => d._id === form.document_id) || null;
  const willReduce = reducesBalance(form.party_type, form.direction);
  const documentBalanceAfter = selectedDocument
    ? Math.round(
        (num(selectedDocument.balance) +
          (willReduce ? -gstFinalAmount : gstFinalAmount)) *
          100
      ) / 100
    : 0;
  const documentSelectOptions = documentOptions.map((d) => ({
    value: d._id,
    label: `${d.voucher_no}  ·  ${t("balance")} ${currencySymbol(
      d.currency_code
    )}${fmt(d.balance)}`,
  }));

  const columns = [
    {
      name: t("Voucher"),
      minWidth: "210px",
      wrap: false,
      selector: (r) => (
        <div className="py-50">
          <div>
            <span
              className="fw-bold text-nowrap cursor-pointer"
              onClick={() => setViewNote(r)}
              // Forced !important — the theme's link/text colours override a
              // plain class or inline style here (same trap as the badges).
              ref={(el) => {
                if (el) el.style.setProperty("color", "#09418B", "important");
              }}
            >
              {r?.voucher_no || "-"}
            </span>
          </div>
          <div className="mt-25">
            {r?.voided_at ? (
              <Badge className="doc-badge doc-badge-red">{t("Voided")}</Badge>
            ) : (
              <Badge className="doc-badge doc-badge-green">{t("Posted")}</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      // The invoice / Vendor PO this row relates to — the adjustment's target,
      // a receipt's invoice, or a payment's Vendor PO. Linked to that document's
      // page (customer → Invoice, vendor → Vendor PO).
      name: t("Document Voucher"),
      minWidth: "190px",
      selector: (r) => {
        if (!r?.document_voucher_no) {
          return <span className="text-muted">{"-"}</span>;
        }
        // No id (older rows) → show the number without a link rather than a
        // dead link.
        if (!r?.document_id) {
          return <span className="text-nowrap">{r.document_voucher_no}</span>;
        }
        const to =
          r.party_type === "vendor"
            ? `${appsRoot}/po-vendors/view/${r.document_id}`
            : `${appsRoot}/invoices/view/${r.document_id}`;
        return (
          <Link
            to={to}
            className="text-nowrap fw-semibold"
            ref={(el) => {
              // Same !important trap as the voucher cell — the theme overrides
              // a plain link colour.
              if (el) el.style.setProperty("color", "#09418B", "important");
            }}
          >
            {r.document_voucher_no}
          </Link>
        );
      },
    },
    { name: t("Date"), selector: (r) => dateOnly(r?.date) },
    {
      name: t("Source"),
      minWidth: "150px",
      selector: (r) => (
        <span className="text-nowrap">{SOURCE_LABELS[r?.source] || "-"}</span>
      ),
    },
    {
      name: t("Party"),
      grow: 3,
      minWidth: "220px",
      selector: (r) => (
        <div className="py-50">
          <Badge className="doc-badge doc-badge-gray text-capitalize">
            {r?.party_type}
          </Badge>
          <div className="mt-25 fw-semibold text-nowrap">
            {r?.party_name || "-"}
          </div>
        </div>
      ),
    },
    {
      name: t("Type"),
      selector: (r) => (
        <Badge color={r?.direction === "debit" ? "light-danger" : "light-success"}>
          {r?.direction === "debit" ? t("Debit") : t("Credit")}
        </Badge>
      ),
    },
    {
      name: t("Amount"),
      right: true,
      selector: (r) => `${currencySymbol(r?.currency_code)}${fmt(r?.amount)}`,
    },
    {
      name: t("Action"),
      center: true,
      cell: (r) => (
        <div className="d-flex align-items-center column-action gap-1">
          <Eye
            size={18}
            className="cursor-pointer text-primary"
            title={t("View")}
            onClick={() => setViewNote(r)}
          />
          {/* Void from the register: adjustment notes directly, and customer
              receipts / vendor payments through their document's own void
              endpoint (needs the linked document id). */}
          {!r?.voided_at &&
          canVoid &&
          (r?.source === "adjustment" ||
            ((r?.source === "receipt" || r?.source === "payment") &&
              r?.document_id)) ? (
            <Button
              size="sm"
              color="link"
              className="p-0 text-danger"
              onClick={() => handleVoid(r)}
            >
              {t("Void")}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content adjustment-notes">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Adjustment Notes")}</h3>
        </div>
        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col md="9">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      value={searchInput}
                      placeholder={t("Search voucher / reason / party")}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      classNamePrefix="select"
                      isClearable
                      options={PARTY_OPTIONS.map((o) => ({
                        ...o,
                        label: t(o.label),
                      }))}
                      value={
                        PARTY_OPTIONS.filter((o) => o.value === partyTypeFilter).map(
                          (o) => ({ ...o, label: t(o.label) })
                        )[0] || null
                      }
                      onChange={(s) => {
                        setPartyTypeFilter(s ? s.value : "");
                        setPartyIdFilter("");
                      }}
                      placeholder={t("All parties")}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      classNamePrefix="select"
                      isDisabled={!partyTypeFilter}
                      // Only offer the ✕ once a specific party is picked —
                      // clearing the "All" row would be a no-op.
                      isClearable={!!partyIdFilter}
                      options={[allPartyOption, ...partyFilterOptions]}
                      value={
                        partyFilterOptions.find((o) => o.value === partyIdFilter) ||
                        (partyTypeFilter ? allPartyOption : null)
                      }
                      onChange={(s) => setPartyIdFilter(s ? s.value : "")}
                      placeholder={t("Select party type first")}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      classNamePrefix="select"
                      isClearable
                      options={DIRECTION_OPTIONS.map((o) => ({
                        ...o,
                        label: t(o.label),
                      }))}
                      value={
                        DIRECTION_OPTIONS.filter(
                          (o) => o.value === directionFilter
                        ).map((o) => ({ ...o, label: t(o.label) }))[0] || null
                      }
                      onChange={(s) => setDirectionFilter(s ? s.value : "")}
                      placeholder={t("DR / CR")}
                    />
                  </Col>
                </Row>
              </Col>
              <Col md="3" className="text-end listing-toolbar-actions">
                {canAdd && (
                  <Button color="primary" onClick={openModal}>
                    <PlusCircle size={14} className="me-50" />
                    {t("Add Adjustment")}
                  </Button>
                )}
              </Col>
            </Row>
            <Row className="mt-2">
              <Col md="12">
                <DatatablePagination
                  columns={columns}
                  data={store?.items || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={store?.pagination}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      {/* Add modal */}
      <Modal isOpen={open} toggle={() => setOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setOpen(false)}>
          {t("Add Adjustment Note")}
        </ModalHeader>
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
            {/* Worded by EFFECT, not by DR/CR — the accounting names invert
                between customer and vendor and nobody remembers which. The
                stored `direction` value is unchanged. */}
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
                  // GST only lives on a debit note — clear it on credit.
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
                invalid={!!errors.note_date || isClosedPeriod(form.note_date, booksClosedUpto)}
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

            {/* GST — vendor + debit only. Base + GST = the amount that posts. */}
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
            {/* Optional document link. Left blank the note stays party-level
                (only the ledger moves) — exactly the old behaviour. Picked, it
                also moves that document's own balance and status. */}
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
              {errors.document_id && (
                <div className="text-danger small mt-25">
                  {errors.document_id}
                </div>
              )}
              {selectedDocument && gstFinalAmount > 0 ? (
                <div className="alert alert-primary py-50 px-1 mt-50 mb-0 small">
                  <strong>{selectedDocument.voucher_no}</strong>{" "}
                  {t("balance will change from")}{" "}
                  <strong>
                    {currencySymbol(selectedDocument.currency_code)}
                    {fmt(selectedDocument.balance)}
                  </strong>{" "}
                  →{" "}
                  <strong>
                    {currencySymbol(selectedDocument.currency_code)}
                    {fmt(documentBalanceAfter)}
                  </strong>
                  {documentBalanceAfter <= 0.01 && willReduce
                    ? ` — ${t("it will be marked fully settled")}.`
                    : "."}
                </div>
              ) : (
                <div className="text-muted small mt-25">
                  {t(
                    "Leave blank to adjust the party's overall balance only. Pick a document to change that document's balance too."
                  )}
                </div>
              )}
            </Col>

            <Col md="12" className="mb-2">
              <Label className="form-label">
                {t("Reason")} <span className="text-danger">*</span>
              </Label>
              <Input
                type="textarea"
                rows="3"
                value={form.reason}
                placeholder={t("Reason / reference — e.g. goodwill credit vs INV STIPL119")}
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
          <Button color="secondary" outline onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={submit} disabled={saving}>
            {t("Post")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* View drawer (right-side) */}
      <Offcanvas
        direction="end"
        isOpen={!!viewNote}
        toggle={() => setViewNote(null)}
      >
        <OffcanvasHeader toggle={() => setViewNote(null)}>
          {t("Adjustment Note")}
        </OffcanvasHeader>
        <OffcanvasBody>
          {viewNote && (
            <div className="an-view">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="mb-0">{viewNote.voucher_no || "-"}</h5>
                {viewNote.voided_at ? (
                  <Badge className="doc-badge doc-badge-red">{t("Voided")}</Badge>
                ) : (
                  <Badge className="doc-badge doc-badge-green">{t("Posted")}</Badge>
                )}
              </div>
              <hr />
              {[
                [t("Source"), t(SOURCE_LABELS[viewNote.source] || "-")],
                [t("Party Type"), (viewNote.party_type || "").toUpperCase()],
                [t("Party"), viewNote.party_name || "-"],
                [t("Date"), dateOnly(viewNote.date)],
                [
                  t("Type"),
                  viewNote.direction === "debit"
                    ? t("Debit (DR)")
                    : t("Credit (CR)"),
                ],
                // Plain-language effect + the document it settled, mirroring
                // the wording on the create form.
                ...(viewNote.source === "adjustment"
                  ? [
                      [
                        t("Effect"),
                        reducesBalance(viewNote.party_type, viewNote.direction)
                          ? t("Reduces the bill")
                          : t("Increases the bill"),
                      ],
                    ]
                  : []),
                // Linked document (Invoice / Vendor PO) — clickable to its page.
                // Present on adjustments (applied-to doc), receipts (invoice) and
                // payments (Vendor PO). Falls back to the party-level wording only
                // for a document-less adjustment.
                ...(viewNote.document_voucher_no
                  ? [
                      [
                        t("Document Voucher"),
                        viewNote.document_id ? (
                          <Link
                            to={
                              viewNote.party_type === "vendor"
                                ? `${appsRoot}/po-vendors/view/${viewNote.document_id}`
                                : `${appsRoot}/invoices/view/${viewNote.document_id}`
                            }
                            ref={(el) => {
                              if (el)
                                el.style.setProperty(
                                  "color",
                                  "#09418B",
                                  "important"
                                );
                            }}
                          >
                            {viewNote.document_voucher_no}
                          </Link>
                        ) : (
                          viewNote.document_voucher_no
                        ),
                      ],
                    ]
                  : viewNote.source === "adjustment"
                    ? [[t("Applied To"), t("Whole party (no document)")]]
                    : []),
                // GST breakdown — only on a vendor + debit note (gst_amount set).
                ...(viewNote.gst_amount != null
                  ? [
                      [
                        t("Base Amount"),
                        `${currencySymbol(viewNote.currency_code)}${fmt(
                          viewNote.base_amount
                        )}`,
                      ],
                      [t("GST Rate (%)"), `${fmt(viewNote.gst_rate)}%`],
                      [
                        t("GST Value"),
                        `${currencySymbol(viewNote.currency_code)}${fmt(
                          viewNote.gst_amount
                        )}`,
                      ],
                    ]
                  : []),
                [
                  viewNote.gst_amount != null ? t("Total Amount") : t("Amount"),
                  `${currencySymbol(viewNote.currency_code)}${fmt(viewNote.amount)}`,
                ],
              ].map(([k, v]) => (
                <div className="d-flex justify-content-between py-50" key={k}>
                  <span className="text-muted">{k}</span>
                  <span className="fw-semibold text-end">{v}</span>
                </div>
              ))}
              <div className="mt-1">
                <div className="text-muted mb-25">
                  {viewNote.source === "adjustment"
                    ? t("Reason")
                    : t("Particulars")}
                </div>
                <div className="border rounded p-1 bg-light">
                  {viewNote.particulars || "-"}
                </div>
              </div>
              {viewNote.voided_at && (
                <div className="mt-1">
                  <div className="text-muted mb-25">{t("Void Reason")}</div>
                  <div className="border rounded p-1 bg-light">
                    {viewNote.voided_reason || "-"}
                  </div>
                </div>
              )}
              {!viewNote.voided_at &&
                canVoid &&
                (viewNote.source === "adjustment" ||
                  ((viewNote.source === "receipt" ||
                    viewNote.source === "payment") &&
                    viewNote.document_id)) && (
                  <Button
                    color="outline-danger"
                    className="mt-2 w-100"
                    onClick={() => {
                      const r = viewNote;
                      setViewNote(null);
                      handleVoid(r);
                    }}
                  >
                    {viewNote.source === "adjustment"
                      ? t("Void this note")
                      : t("Void this payment")}
                  </Button>
                )}
            </div>
          )}
        </OffcanvasBody>
      </Offcanvas>
    </Fragment>
  );
};

export default AdjustmentNotes;
