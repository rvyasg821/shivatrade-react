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
import EntitySearchSelect from "@components/entity-select";
import { useBooksClosedUpto, isClosedPeriod, closedPeriodMessage } from "@src/hooks/useBooksClosed";
import Notification from "@components/toast/notification";
import { defaultPerPageRow, isAdminUser, appsRoot } from "@constant/defaultValues";
import { currencySymbol } from "@src/views/_shared/sales-doc/_helpers";
import {
  getAdjustmentNoteList,
  voidAdjustmentNote,
  cleanAdjustmentNoteMessage,
} from "./store";
import AdjustmentNoteModal from "./AdjustmentNoteModal";

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
  grn: "Goods Received (GRN)",
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

  useEffect(() => {
    // Create (shared modal) and void (handleVoid) surface their own toasts +
    // refresh via the thunk result; here we only show list-load errors and
    // clear any leftover flag so it can't re-fire.
    if (store?.actionFlag === "AN_LST_ERR" && store?.error) {
      Notification(t("Error"), store.error, "warning");
    }
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanAdjustmentNoteMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  // ── Add modal (shared AdjustmentNoteModal) ──
  const [open, setOpen] = useState(false);

  // ── View drawer (right-side) ──
  const [viewNote, setViewNote] = useState(null);

  // Create-note form logic now lives in the shared <AdjustmentNoteModal />.

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
          dispatch(voidAdjustmentNote({ id: row._id, reason })).then((r) => {
            if (r?.meta?.requestStatus === "fulfilled") {
              Notification("Success", t("Adjustment note voided."), "success");
              handleLists();
            } else {
              Notification(
                "Error",
                r?.payload || t("Failed to void note"),
                "warning"
              );
            }
          });
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
      minWidth: "200px",
      selector: (r) => (
        <span className="text-nowrap pe-3">
          {SOURCE_LABELS[r?.source] || "-"}
        </span>
      ),
    },
    {
      name: t("Party"),
      grow: 3,
      minWidth: "220px",
      selector: (r) => (
        <div className="py-50 ps-1">
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
                    <EntitySearchSelect
                      key={partyTypeFilter || "none"}
                      kind={partyTypeFilter || "customer"}
                      isDisabled={!partyTypeFilter}
                      isClearable={!!partyIdFilter}
                      value={partyIdFilter || null}
                      onChange={(s) => setPartyIdFilter(s ? s.value : "")}
                      placeholder={
                        partyTypeFilter
                          ? t("Search & select party")
                          : t("Select party type first")
                      }
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
                  <Button color="primary" onClick={() => setOpen(true)}>
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

      {/* Add Adjustment Note — shared, prefillable popup */}
      <AdjustmentNoteModal
        isOpen={open}
        toggle={() => setOpen(false)}
        prefill={{ party_type: "customer" }}
        onPosted={handleLists}
      />

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
