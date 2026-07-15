// Activity tab — the audit trail, rendered as sentences with an expandable
// field-level diff. Reads GET /admin/tracking/activity.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Label, Input, Table, Badge, Spinner } from "reactstrap";
import ReactPaginate from "react-paginate";
import Select from "react-select";
import { ChevronDown, ChevronRight } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import { getActivityLog } from "../store";
import { formatDateTime } from "@src/utility/dateFormat";

// Mirrors the backend's audit allowlist. Values are TypeORM class names; labels
// are what the team calls them (PurchaseOrderEntity = Sales Order).
const ENTITY_OPTIONS = [
  { value: "", label: "All documents" },
  { value: "QuotationEntity", label: "Quotation" },
  { value: "PurchaseOrderEntity", label: "Sales Order" },
  { value: "PoVendorEntity", label: "Vendor PO" },
  { value: "GrnEntity", label: "GRN" },
  { value: "DebitNoteEntity", label: "Debit Note" },
  { value: "InvoiceEntity", label: "Invoice" },
  { value: "ProductEntity", label: "Product" },
  { value: "PriceListEntity", label: "Price List" },
  { value: "VendorEntity", label: "Vendor" },
  { value: "CustomerEntity", label: "Customer" },
  { value: "CompanyEntity", label: "Company" },
  { value: "UserEntity", label: "User" },
  { value: "RoleEntity", label: "Role" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "soft_delete", label: "Deleted (soft)" },
  { value: "import", label: "Imported" },
];

const ACTION_COLOR = {
  create: "light-success",
  update: "light-primary",
  delete: "light-danger",
  soft_delete: "light-danger",
  import: "light-info",
};

const fmtValue = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const ActivityTab = ({ reloadKey }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingLogs);
  const { items, total, perPage: serverPerPage } = store.activity;

  const [entityName, setEntityName] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(() => {
    dispatch(
      getActivityLog({
        entity_name: entityName || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        perPage,
      })
    );
  }, [dispatch, entityName, action, from, to, page, perPage]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  // Narrowing a filter while on page 4 would render an empty table.
  useEffect(() => {
    setPage(1);
  }, [entityName, action, from, to, perPage]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (serverPerPage || 25))),
    [total, serverPerPage]
  );

  const toggleRow = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Fragment>
      <Row className="mb-2">
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("Document")}</Label>
          <Select
            classNamePrefix="select"
            options={ENTITY_OPTIONS}
            value={ENTITY_OPTIONS.find((o) => o.value === entityName)}
            onChange={(opt) => setEntityName(opt?.value || "")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("Action")}</Label>
          <Select
            classNamePrefix="select"
            options={ACTION_OPTIONS}
            value={ACTION_OPTIONS.find((o) => o.value === action)}
            onChange={(opt) => setAction(opt?.value || "")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("From")}</Label>
          <DateInput
            id="activity-from"
            value={from}
            onChange={(d, str, iso) => setFrom(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("To")}</Label>
          <DateInput
            id="activity-to"
            value={to}
            onChange={(d, str, iso) => setTo(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
      </Row>

      {store.loadingActivity ? (
        <div className="text-center py-4">
          <Spinner />
        </div>
      ) : !items?.length ? (
        <div className="text-center text-muted py-4">
          {t("No activity recorded for this filter.")}
        </div>
      ) : (
        <div className="table-responsive">
          <Table size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 34 }} />
                <th style={{ width: 160 }}>{t("When")}</th>
                <th style={{ width: 150 }}>{t("Who")}</th>
                <th style={{ width: 110 }}>{t("Action")}</th>
                <th>{t("What happened")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const open = !!expanded[row._id];
                const hasDiff = (row.diff || []).length > 0;
                return (
                  <Fragment key={row._id}>
                    <tr>
                      <td>
                        {hasDiff ? (
                          <span
                            className="cursor-pointer"
                            onClick={() => toggleRow(row._id)}
                          >
                            {open ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-nowrap small text-muted">
                        {formatDateTime(row.at)}
                      </td>
                      <td className="text-nowrap fw-semibold">
                        {row.actor_name}
                      </td>
                      <td>
                        <Badge
                          color={ACTION_COLOR[row.action] || "light-secondary"}
                          className="text-capitalize"
                        >
                          {String(row.action).replace("_", " ")}
                        </Badge>
                      </td>
                      <td>{row.sentence}</td>
                    </tr>
                    {open && hasDiff && (
                      <tr className="bg-light">
                        <td colSpan={5} className="small">
                          <Table size="sm" borderless className="mb-0">
                            <tbody>
                              {row.diff.map((d) => (
                                <tr key={d.field}>
                                  <td
                                    className="text-muted text-capitalize"
                                    style={{ width: 220 }}
                                  >
                                    {d.field}
                                  </td>
                                  <td
                                    className="text-danger"
                                    style={{
                                      textDecoration: "line-through",
                                      width: 220,
                                    }}
                                  >
                                    {fmtValue(d.from)}
                                  </td>
                                  <td className="text-success fw-semibold">
                                    {fmtValue(d.to)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-1">
          <div className="d-flex align-items-center">
            <span className="me-1">{t("Show")}</span>
            <Input
              type="select"
              bsSize="sm"
              style={{ width: 90 }}
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Input>
            <span className="ms-1 text-muted">
              {t("of")} {total} {t("entries")}
            </span>
          </div>
          <ReactPaginate
            previousLabel=""
            nextLabel=""
            forcePage={page - 1}
            onPageChange={(p) => setPage(p.selected + 1)}
            pageCount={pageCount}
            breakLabel="..."
            pageRangeDisplayed={2}
            marginPagesDisplayed={2}
            activeClassName="active"
            pageClassName="page-item"
            breakClassName="page-item"
            nextLinkClassName="page-link"
            pageLinkClassName="page-link"
            breakLinkClassName="page-link"
            previousLinkClassName="page-link"
            nextClassName="page-item next"
            previousClassName="page-item prev"
            containerClassName="pagination react-paginate justify-content-end mb-0"
          />
        </div>
      )}
    </Fragment>
  );
};

export default ActivityTab;
