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
  Label,
  Badge,
  Button,
} from "reactstrap";
import Select from "react-select";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { formatDate } from "@src/utility/dateFormat";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

import { useTranslation } from "react-i18next";

import { Activity, Download } from "react-feather";

import { defaultPerPageRow } from "@constant/defaultValues";

import InventoryStatsCards from "./InventoryStatsCards";
import MovementHistoryModal from "./MovementHistoryModal";

// Trim trailing zeros on a qty string ("11.0000" → "11", "11.50" → "11.5").
const fmtQty = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Weighted-average rate → ₹ with 2 decimals.
const fmtRate = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "-";
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Money → ₹ with 2 decimals. Unlike fmtRate, always renders (incl. ₹0.00 and
// negatives) so a value column reads/sums cleanly.
const fmtMoney = (v) => {
  const n = Number(v) || 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const InventoryView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const store = useSelector((s) => s.inventory);
  const vendorStore = useSelector((s) => s.vendor);
  const categoryStore = useSelector((s) => s.category);

  // In-page deliver-to location filter (top-level, scopes BOTH tabs). Empty
  // string = All Locations. Options come from the Locations master; the value
  // matches each POV's `delivery_address_id`, which the stock ledger carries
  // as `grn_in.location_id`. Defaults to All so stock is always visible.
  const [locationFilter, setLocationFilter] = useState("");
  const [companyLocations, setCompanyLocations] = useState([]);
  const selectedLocationId = locationFilter;
  const locationOptions = useMemo(
    () => [
      { value: "", label: t("All Locations") },
      ...companyLocations.map((l) => ({
        value: l._id,
        label: l.location_code
          ? `${l.location_code} - ${l.location_name}`
          : l.location_name,
      })),
    ],
    [companyLocations, t]
  );

  // Product whose stock-movement ledger drawer is open (Action → Stock Movements).
  const [openProductId, setOpenProductId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      if (inStockOnly) p.in_stock_only = true;
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
      inStockOnly,
      dispatch,
    ]
  );

  /**
   * Closing-inventory Excel. Sends the SAME filters the table is showing but
   * no paging — the backend returns every matching row, because an export that
   * quietly stopped at page 1 is worse than none for reconciliation.
   */
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = { search: searchInput || undefined };
      if (categoryFilter) params.category_id = categoryFilter;
      if (vendorFilter) params.vendor_id = vendorFilter;
      if (selectedLocationId) params.location_id = selectedLocationId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (inStockOnly) params.in_stock_only = true;

      const resp = await instance.get(API_ENDPOINTS.inventory.export, {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `closing-inventory_${
        dateTo || new Date().toISOString().slice(0, 10)
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      Notification("Error", t("Failed to export the inventory"), "warning");
    } finally {
      setExporting(false);
    }
  };

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
      if (inStockOnly) p.in_stock_only = true;
      dispatch(getInventoryStats(p));
    },
    [
      searchInput,
      categoryFilter,
      vendorFilter,
      selectedLocationId,
      dateFrom,
      dateTo,
      inStockOnly,
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

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getCategoryDropdown());
    instance
      .get(`${API_ENDPOINTS.locations.list}`, {
        params: { status: "ACTIVE", dropdown: "yes" },
      })
      .then((resp) => setCompanyLocations(resp?.data?.data || []))
      .catch(() => setCompanyLocations([]));
    window.scrollTo(0, 0);
  }, []);

  // Re-fetch when any filter changes — debounce the free-text search 500ms.
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
    inStockOnly,
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
      width: "46px",
      selector: (row, index) => (
        <span className="text-muted">
          {(currentPage - 1) * rowsPerPage + index + 1}
        </span>
      ),
    },
    {
      // `grow` alone was not enough: every numeric column reserved a wide
      // minWidth, so there was no leftover space to grow into and long product
      // names wrapped to 6-8 lines. An explicit minWidth reserves the room the
      // name actually needs; the numeric columns below were tightened to pay
      // for it.
      name: t("Product"),
      grow: 3,
      minWidth: "280px",
      wrap: true,
      selector: (row) => (
        <div className="py-50">
          <div className="fw-bold">{row?.product_name || "-"}</div>
          <div className="d-flex align-items-center flex-wrap gap-1 mt-25">
            {row?.product_code ? (
              <span className="small text-muted text-nowrap">
                {row.product_code}
              </span>
            ) : null}
            {row?.category_name ? (
              <Badge
                className="text-nowrap"
                style={{ backgroundColor: "#0d6efd", color: "#fff" }}
              >
                {row.category_name}
              </Badge>
            ) : null}
          </div>
        </div>
      ),
    },
    // Stock summary over the Received From/To period (from the ledger).
    {
      name: t("Opening"),
      center: true,
      hide: "md",
      minWidth: "84px",
      selector: (row) => (
        <span className="text-nowrap">{fmtQty(row?.opening_qty)}</span>
      ),
    },
    {
      name: t("Inward"),
      center: true,
      minWidth: "84px",
      selector: (row) => (
        <span className="text-nowrap fw-semibold" style={{ color: "#28c76f" }}>
          {fmtQty(row?.inward_qty)}
        </span>
      ),
    },
    {
      name: t("Outward"),
      center: true,
      minWidth: "84px",
      selector: (row) => (
        <span className="text-nowrap fw-semibold" style={{ color: "#ea5455" }}>
          {fmtQty(row?.outward_qty)}
        </span>
      ),
    },
    {
      name: t("Closing"),
      center: true,
      minWidth: "84px",
      selector: (row) => (
        <span className="text-nowrap fw-semibold">
          {fmtQty(row?.closing_qty)}
        </span>
      ),
    },
    {
      // Closing Qty × Avg Rate — the PERIOD-END valuation. Distinct from
      // "Stock Value" further right, which values TODAY's on-hand; with a
      // "Received To" date set the two legitimately differ, and this is the
      // one that reconciles to the books.
      name: t("Closing Value"),
      center: true,
      minWidth: "116px",
      // fmtMoney, not fmtRate: this is a money column, so a zero closing
      // balance must read ₹0.00 like Stock Value does — fmtRate renders 0 as
      // "-", which made the two columns disagree on the same fact.
      selector: (row) => (
        <span className="text-nowrap fw-semibold">
          {fmtMoney(row?.closing_value)}
        </span>
      ),
    },
    {
      name: t("Qty in Stock"),
      center: true,
      minWidth: "112px",
      // Live ledger on-hand (GRN-in − invoice-out) — drops to 0 once sold out,
      // not the received qty. Green = in stock, red = negative, muted = zero.
      selector: (row) => {
        const n = Number(row?.on_hand) || 0;
        return (
          <span
            className="text-nowrap fw-bold"
            style={{ color: n > 0 ? "#28c76f" : n < 0 ? "#ea5455" : "#6e6b7b" }}
          >
            {fmtQty(row?.on_hand)}
            {row?.uom ? ` ${row.uom}` : ""}
          </span>
        );
      },
    },
    {
      name: t("Avg Rate"),
      center: true,
      hide: "md",
      minWidth: "100px",
      // Weighted-average received unit price (₹/unit).
      selector: (row) => (
        <span className="text-nowrap">{fmtRate(row?.avg_rate)}</span>
      ),
    },
    {
      name: t("Stock Value"),
      center: true,
      minWidth: "116px",
      // Per-product on-hand valuation = Qty in Stock × Avg Rate (₹). Summing
      // this column across ALL products equals the "Current Stock Value" card
      // (the footer Total below shows that grand total straight from the KPI).
      selector: (row) => {
        const val =
          (Number(row?.on_hand) || 0) * (Number(row?.avg_rate) || 0);
        return (
          <span
            className="text-nowrap fw-semibold"
            style={{ color: val < 0 ? "#ea5455" : undefined }}
          >
            {fmtMoney(val)}
          </span>
        );
      },
    },
    {
      name: t("Receipt Date"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      center: true,
      minWidth: "112px",
      selector: (row) => (
        <span className="text-nowrap">
          {row?.arrival_date ? formatDate(row.arrival_date) : "-"}
        </span>
      ),
    },
    {
      name: t("Action"),
      center: true,
      minWidth: "90px",
      cell: (row, index) => (
        <div className="d-flex align-items-center justify-content-center">
          {/* Stock Movements — the product's IN/OUT ledger + running balance
              (every GRN-in / sale-out with its source voucher). */}
          <span
            className="cursor-pointer text-primary"
            id={`inv-mov-${row?.product_id || index}`}
            onClick={() => row?.product_id && setOpenProductId(row.product_id)}
          >
            <Activity size={18} />
            <UncontrolledTooltip
              placement="top"
              target={`inv-mov-${row?.product_id || index}`}
            >
              {t("Stock Movements")}
            </UncontrolledTooltip>
          </span>
        </div>
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
                  {/* Deliver-to location — scopes the register (All = no filter). */}
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <Select
                      classNamePrefix="select"
                      placeholder={t("All Locations")}
                      options={locationOptions}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
                      value={
                        locationOptions.find(
                          (o) => o.value === locationFilter
                        ) || locationOptions[0]
                      }
                      onChange={(opt) =>
                        setLocationFilter(opt ? opt.value : "")
                      }
                    />
                  </Col>
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-inventory"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search product / PO / POV")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Category")}
                      options={categoryOptions}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
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
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Vendor")}
                      options={vendorOptions}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
                      value={
                        vendorOptions.find((o) => o.value === vendorFilter) ||
                        null
                      }
                      onChange={(opt) => setVendorFilter(opt ? opt.value : "")}
                    />
                  </Col>
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("Received From")}
                    />
                  </Col>
                  <Col sm="6" md className="mb-2 mb-md-0">
                    <DateInput
                      id="inv-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("Received To")}
                    />
                  </Col>
                  <Col
                    xs="12"
                    md="auto"
                    className="mb-2 mb-md-0 d-flex align-items-center gap-2"
                  >
                    <div className="form-check form-switch mb-0">
                      <Input
                        type="switch"
                        id="inv-in-stock-only"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                      />
                      <Label
                        className="form-check-label text-nowrap"
                        for="inv-in-stock-only"
                      >
                        {t("In stock only")}
                      </Label>
                    </div>
                    {/* Closing-inventory Excel for the CURRENT filters, all
                        rows (not just this page) — reconciliation needs the
                        whole set. */}
                    <Button
                      color="success"
                      outline
                      size="sm"
                      className="text-nowrap"
                      onClick={handleExport}
                      disabled={exporting}
                    >
                      <Download size={14} className="me-50" />
                      {exporting ? t("Exporting…") : t("Export")}
                    </Button>
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

                {/* Grand total across ALL filtered products (not just this
                    page) — the exact figure the KPI "Current Stock Value" card
                    abbreviates (e.g. "₹8.1 K"). Lets the client verify by
                    summing the Stock Value column. */}
                <div className="d-flex justify-content-end align-items-center flex-wrap border-top pt-1 mt-1">
                  <span className="text-muted me-1">
                    {t("Total Stock Value")} ({t("all products")}):
                  </span>
                  <span className="fw-bold fs-5">
                    {fmtMoney(store?.stats?.stock_value)}
                  </span>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <MovementHistoryModal
        isOpen={!!openProductId}
        productId={openProductId}
        toggle={() => setOpenProductId(null)}
      />
    </Fragment>
  );
};

export default InventoryView;
