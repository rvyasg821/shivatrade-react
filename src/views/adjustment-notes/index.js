import { Fragment, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
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
import Notification from "@components/toast/notification";
import { defaultPerPageRow, isAdminUser } from "@constant/defaultValues";
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
const DIRECTION_OPTIONS = [
  { value: "debit", label: "Debit (DR)" },
  { value: "credit", label: "Credit (CR)" },
];
// The list is a register of every party money-movement, not just notes.
const SOURCE_LABELS = {
  adjustment: "Adjustment Note",
  receipt: "Customer Receipt",
  payment: "Vendor Payment",
};

const AdjustmentNotes = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
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

  const openModal = () => {
    setForm({
      party_type: "customer",
      party_id: "",
      party_currency: "",
      direction: "credit",
      note_date: new Date().toISOString().slice(0, 10),
      amount: "",
      reason: "",
    });
    setErrors({});
    loadParties("customer");
    setOpen(true);
  };

  const onPartyType = (v) => {
    setForm((s) => ({ ...s, party_type: v, party_id: "", party_currency: "" }));
    loadParties(v);
  };

  const submit = () => {
    const e = {};
    if (!form.party_id) e.party_id = t("Select a party");
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
        reason: form.reason.trim(),
      })
    )
      .then((r) => {
        if (r?.meta?.requestStatus === "fulfilled") setOpen(false);
      })
      .finally(() => setSaving(false));
  };

  const handleVoid = (row) => {
    mySwal
      .fire({
        title: t("Void this adjustment note?"),
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
      .then((res) => {
        if (!res.isConfirmed) return;
        dispatch(voidAdjustmentNote({ id: row._id, reason: res.value || undefined }));
      });
  };

  const currencyOfSelectedParty = () => {
    if (form.party_type === "vendor") return "INR";
    const opt = partyOptions.find((o) => o.value === form.party_id);
    return opt?.currency || "";
  };

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
          {/* Payments/receipts are voided from their own document tab — this
              register only owns adjustment notes. */}
          {r?.source === "adjustment" && !r?.voided_at && canVoid ? (
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
                onChange={(opt) =>
                  setForm((s) => ({ ...s, party_id: opt ? opt.value : "" }))
                }
                placeholder={t("Select party")}
              />
              {errors.party_id && (
                <div className="text-danger small">{errors.party_id}</div>
              )}
            </Col>
            <Col md="6" className="mb-2">
              <Label className="form-label">
                {t("Type")} <span className="text-danger">*</span>
              </Label>
              <Select
                classNamePrefix="select"
                options={DIRECTION_OPTIONS.map((o) => ({
                  ...o,
                  label: t(o.label),
                }))}
                value={
                  DIRECTION_OPTIONS.filter((o) => o.value === form.direction).map(
                    (o) => ({ ...o, label: t(o.label) })
                  )[0] || null
                }
                onChange={(opt) =>
                  setForm((s) => ({ ...s, direction: opt ? opt.value : "credit" }))
                }
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
              />
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
                [
                  t("Amount"),
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
              {viewNote.source === "adjustment" && !viewNote.voided_at && canVoid && (
                <Button
                  color="outline-danger"
                  className="mt-2 w-100"
                  onClick={() => {
                    const r = viewNote;
                    setViewNote(null);
                    handleVoid(r);
                  }}
                >
                  {t("Void this note")}
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
