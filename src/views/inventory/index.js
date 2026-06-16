// Inventory (Stock Register) listing page.
// Read-only: one row per non-cancelled POV line with QC-accepted qty from
// confirmed GRNs (partial receipts on still-open POVs included). No "Add"
// action — receipts come from the GRN flow. The detail modal opens via the
// `?receipt=<pov_line_id>` URL param (deep-linkable + back-friendly).
//
// Uses a plain reactstrap <Table> (not the datatable) so we control header
// no-wrap + column widths and never force a horizontal scrollbar.

import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { getInventoryList, cleanInventoryMessage } from "./store";
import { getVendorDropdown } from "../vendors/store";
import { getCategoryDropdown } from "../categories/store";
import { startLoading, stopLoading } from "../loadingstore";

import {
  Col,
  Row,
  Card,
  Input,
  CardBody,
  Table,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";

import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import { formatDate } from "@src/utility/dateFormat";

import { useTranslation } from "react-i18next";

import { Eye, ExternalLink } from "react-feather";

import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

import ReceiptDetailModal from "./ReceiptDetailModal";

// Trim trailing zeros on a qty string ("11.0000" → "11", "11.50" → "11.5").
const fmtQty = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const PAGE_SIZES = [10, 25, 50, 100];

const InventoryView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const store = useSelector((s) => s.inventory);
  const vendorStore = useSelector((s) => s.vendor);
  const categoryStore = useSelector((s) => s.category);
  // Top-level header location switcher — scopes the register to the
  // deliver-to location stored on each POV (Locations master id). The
  // header auto-selects a default, so this is normally always set.
  const selectedLocationId = useSelector(
    (s) => s.locationContext?.selectedLocationId
  );

  const [params, setParams] = useSearchParams();
  const receiptId = params.get("receipt");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleList = useCallback(
    (
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      categoryId = categoryFilter,
      vendorId = vendorFilter,
      from = dateFrom,
      to = dateTo
    ) => {
      const p = {
        orderBy: "arrival_date",
        orderDirection: "desc",
        page,
        perPage,
        search,
      };
      if (categoryId) p.category_id = categoryId;
      if (vendorId) p.vendor_id = vendorId;
      if (selectedLocationId) p.location_id = selectedLocationId;
      if (from) p.date_from = from;
      if (to) p.date_to = to;
      dispatch(getInventoryList(p));
    },
    [
      currentPage,
      rowsPerPage,
      searchInput,
      categoryFilter,
      vendorFilter,
      selectedLocationId,
      dateFrom,
      dateTo,
      dispatch,
    ]
  );

  const handlePagination = (selected) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(selected + 1);
    handleList(selected + 1);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(1, value);
  };

  const handleSearch = (value) => setSearchInput(value);

  // This page has no other query params, so set/clear the whole search
  // string directly — avoids the same-ref / function-updater pitfalls of
  // mutating the existing URLSearchParams.
  const openReceipt = (id) => {
    if (id) setParams({ receipt: id });
  };

  const closeReceipt = () => setParams({});

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getCategoryDropdown());
    window.scrollTo(0, 0);
  }, []);

  // Re-fetch when any filter changes — debounce the free-text search 500ms
  // so the table doesn't re-query on every keystroke.
  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleList(1, rowsPerPage, searchInput);
      }, 500);
    } else {
      setCurrentPage(1);
      handleList(1, rowsPerPage, searchInput);
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchInput,
    categoryFilter,
    vendorFilter,
    selectedLocationId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanInventoryMessage(null));
    }
    if (store?.error) Notification("Error", store.error, "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.loading]);

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => {
        const name = v.company_name || v.name || "";
        return {
          value: v._id,
          label: v.vendor_code ? `${v.vendor_code} - ${name}` : name,
        };
      }),
    [vendorStore?.vendorDropdown]
  );

  const categoryOptions = useMemo(
    () =>
      (categoryStore?.categoryDropdown || []).map((c) => ({
        value: c._id,
        label: c.name,
      })),
    [categoryStore?.categoryDropdown]
  );

  const rows = store?.inventoryItems || [];
  const total = store?.pagination?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));

  return (
    <Fragment>
      <div className="main-content inventory">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Inventory")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="12" md="12">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-inventory"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search product / PO / POV")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Category")}
                      options={categoryOptions}
                      value={
                        categoryOptions.find(
                          (o) => o.value === categoryFilter
                        ) || null
                      }
                      onChange={(opt) =>
                        setCategoryFilter(opt ? opt.value : "")
                      }
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Vendor")}
                      options={vendorOptions}
                      value={
                        vendorOptions.find((o) => o.value === vendorFilter) ||
                        null
                      }
                      onChange={(opt) => setVendorFilter(opt ? opt.value : "")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("Received From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("Received To")}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            <div className="table-responsive mt-2">
              <Table className="align-middle mb-0" size="sm" bordered hover>
                <thead className="table-light">
                  <tr className="text-nowrap">
                    <th style={{ width: 50 }}>#</th>
                    <th>{t("Product")}</th>
                    <th>{t("Category")}</th>
                    <th>{t("SO # / POV #")}</th>
                    <th>{t("Vendor")}</th>
                    <th className="text-end">{t("Qty in Stock")}</th>
                    <th>{t("Receipt Date")}</th>
                    <th className="text-center">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        {t("There are no records to display")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.pov_line_id || index}>
                        <td className="text-muted">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                        <td style={{ minWidth: 200 }}>
                          <div className="fw-bold text-nowrap">
                            {row?.product_code || "-"}
                          </div>
                          {row?.product_name ? (
                            <div className="small text-muted">
                              {row.product_name}
                            </div>
                          ) : null}
                        </td>
                        <td className="text-nowrap">
                          {row?.category_name || "—"}
                        </td>
                        <td style={{ minWidth: 190 }}>
                          <div>
                            {row?.po_id ? (
                              <Link
                                to={`${appsRoot}/purchase-orders/view/${row.po_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-nowrap d-inline-flex align-items-center"
                              >
                                {row?.po_voucher_no || "-"}
                                <ExternalLink size={11} className="ms-50" />
                              </Link>
                            ) : (
                              <span className="text-nowrap">
                                {row?.po_voucher_no || "-"}
                              </span>
                            )}
                          </div>
                          <div className="mt-25">
                            {row?.pov_id ? (
                              <Link
                                to={`${appsRoot}/po-vendors/view/${row.pov_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-nowrap d-inline-flex align-items-center small text-muted"
                              >
                                {row?.pov_voucher_no || "-"}
                                <ExternalLink size={11} className="ms-50" />
                              </Link>
                            ) : (
                              <span className="text-nowrap small text-muted">
                                {row?.pov_voucher_no || "-"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-nowrap text-capitalize">
                          {row?.vendor_name || "-"}
                        </td>
                        <td className="text-end text-nowrap fw-bold">
                          {fmtQty(row?.accepted_qty ?? row?.received_qty)}
                          {row?.uom ? ` ${row.uom}` : ""}
                        </td>
                        <td className="text-nowrap">
                          {row?.arrival_date ? formatDate(row.arrival_date) : "-"}
                        </td>
                        <td className="text-center">
                          <span
                            className="cursor-pointer text-primary"
                            id={`inv-view-${row?.pov_line_id || index}`}
                            onClick={() => openReceipt(row?.pov_line_id)}
                          >
                            <Eye size={18} />
                            <UncontrolledTooltip
                              placement="top"
                              target={`inv-view-${row?.pov_line_id || index}`}
                            >
                              {t("View")}
                            </UncontrolledTooltip>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>

            {total > 0 && (
              <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1">
                <div className="d-flex align-items-center small text-muted">
                  <span className="me-50">{t("Show")}</span>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={rowsPerPage}
                    onChange={(e) =>
                      handlePerPage(Number(e.target.value) || defaultPerPageRow)
                    }
                    style={{ width: 80 }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Input>
                  <span className="ms-1">
                    {t("of")} {total} {t("rows")}
                  </span>
                </div>
                <ReactPaginate
                  previousLabel=""
                  nextLabel=""
                  forcePage={currentPage - 1}
                  pageCount={pageCount}
                  activeClassName="active"
                  onPageChange={({ selected }) => handlePagination(selected)}
                  pageClassName="page-item"
                  nextLinkClassName="page-link"
                  nextClassName="page-item next"
                  previousClassName="page-item prev"
                  previousLinkClassName="page-link"
                  pageLinkClassName="page-link"
                  containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ReceiptDetailModal
        isOpen={!!receiptId}
        povLineId={receiptId}
        toggle={closeReceipt}
      />
    </Fragment>
  );
};

export default InventoryView;
