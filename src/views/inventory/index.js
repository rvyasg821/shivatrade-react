// Inventory (Stock Register) listing page.
// Read-only: one row per non-cancelled POV line with QC-accepted qty from
// confirmed GRNs (partial receipts on still-open POVs included). No "Add"
// action — receipts come from the GRN flow. The detail modal opens via the
// `?receipt=<pov_line_id>` URL param (deep-linkable + back-friendly).
//
// Uses the shared DatatablePagination (react-data-table-component) so the
// listing matches the rest of the app (RFQ / leads) — server-side paging,
// "Show N of total" footer and the standard pager.

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
import {
  getInventoryList,
  getInventoryStats,
  cleanInventoryMessage,
} from "./store";
import { getVendorDropdown } from "../vendors/store";
import { getCategoryDropdown } from "../categories/store";
import { startLoading, stopLoading } from "../loadingstore";

import {
  Col,
  Row,
  Card,
  Input,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { formatDate } from "@src/utility/dateFormat";

import { useTranslation } from "react-i18next";

import { Eye, ExternalLink } from "react-feather";

import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

import ReceiptDetailModal from "./ReceiptDetailModal";
import InventoryStatsCards from "./InventoryStatsCards";

// Trim trailing zeros on a qty string ("11.0000" → "11", "11.50" → "11.5").
const fmtQty = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

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

  // KPI cards reflect the filtered set (no page/perPage/sort) — re-fetched
  // alongside the list whenever a filter changes.
  const fetchStats = useCallback(
    (
      search = searchInput,
      categoryId = categoryFilter,
      vendorId = vendorFilter,
      from = dateFrom,
      to = dateTo
    ) => {
      const p = {};
      if (search) p.search = search;
      if (categoryId) p.category_id = categoryId;
      if (vendorId) p.vendor_id = vendorId;
      if (selectedLocationId) p.location_id = selectedLocationId;
      if (from) p.date_from = from;
      if (to) p.date_to = to;
      dispatch(getInventoryStats(p));
    },
    [
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
    const perPage = Number(value) || defaultPerPageRow;
    setRowsPerPage(perPage);
    setCurrentPage(1);
    handleList(1, perPage);
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
        fetchStats(searchInput);
      }, 500);
    } else {
      setCurrentPage(1);
      handleList(1, rowsPerPage, searchInput);
      fetchStats(searchInput);
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

  const columns = [
    {
      name: t("#"),
      width: "60px",
      selector: (row, index) => (
        <span className="text-muted">
          {(currentPage - 1) * rowsPerPage + index + 1}
        </span>
      ),
    },
    {
      name: t("Product"),
      grow: 2,
      selector: (row) => (
        <div className="py-1">
          <div className="fw-bold">{row?.product_name || "-"}</div>
          {row?.product_code ? (
            <div className="small text-muted text-nowrap">
              {row.product_code}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      name: t("Category"),
      selector: (row) => (
        <span className="text-nowrap">{row?.category_name || "—"}</span>
      ),
    },
    {
      name: t("SO # / POV #"),
      grow: 2,
      selector: (row) => (
        <div className="py-1">
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
              <span className="text-nowrap">{row?.po_voucher_no || "-"}</span>
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
        </div>
      ),
    },
    {
      name: t("Vendor"),
      grow: 2,
      selector: (row) => (
        <span className="text-nowrap text-capitalize">
          {row?.vendor_name || "-"}
        </span>
      ),
    },
    {
      name: t("Qty in Stock"),
      center: true,
      minWidth: "150px",
      selector: (row) => (
        <span className="text-nowrap fw-bold">
          {fmtQty(row?.accepted_qty ?? row?.received_qty)}
          {row?.uom ? ` ${row.uom}` : ""}
        </span>
      ),
    },
    {
      name: t("Receipt Date"),
      center: true,
      minWidth: "150px",
      selector: (row) => (
        <span className="text-nowrap">
          {row?.arrival_date ? formatDate(row.arrival_date) : "-"}
        </span>
      ),
    },
    {
      name: t("Action"),
      center: true,
      cell: (row, index) => (
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
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content inventory">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Inventory")}</h3>
        </div>

        <InventoryStatsCards stats={store?.stats} />

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

            <Row className="mt-2">
              <Col md="12" className="inventory-tables">
                <DatatablePagination
                  columns={columns}
                  data={rows}
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

      <ReceiptDetailModal
        isOpen={!!receiptId}
        povLineId={receiptId}
        toggle={closeReceipt}
      />
    </Fragment>
  );
};

export default InventoryView;
