// Inventory → Stock Summary. Per-product on-hand straight from the stock
// ledger (SUM of signed movements). This is the real stock number; the
// "Receipts" tab stays as vendor-side traceability.

import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { useDispatch, useSelector } from "react-redux";
import { getStockSummary } from "./store";
import { getCategoryDropdown } from "../categories/store";
import { startLoading, stopLoading } from "../loadingstore";

import { Col, Row, Input, UncontrolledTooltip, Label } from "reactstrap";
import Select from "react-select";

import DatatablePagination from "@components/datatable/DatatablePagination";
import { formatDate } from "@src/utility/dateFormat";
import { useTranslation } from "react-i18next";
import { Eye } from "react-feather";
import { defaultPerPageRow } from "@constant/defaultValues";

import MovementHistoryModal from "./MovementHistoryModal";

const fmtQty = (v) => {
  if (v === null || v === undefined || v === "") return "0";
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const StockSummary = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const store = useSelector((s) => s.inventory);
  const categoryStore = useSelector((s) => s.category);
  const selectedLocationId = useSelector(
    (s) => s.locationContext?.selectedLocationId
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [openProductId, setOpenProductId] = useState(null);

  const handleList = useCallback(
    (page = currentPage, perPage = rowsPerPage, search = searchInput) => {
      const p = {
        orderBy: "product_name",
        orderDirection: "asc",
        page,
        perPage,
        search,
      };
      if (categoryFilter) p.category_id = categoryFilter;
      if (selectedLocationId) p.location_id = selectedLocationId;
      if (inStockOnly) p.in_stock_only = true;
      dispatch(getStockSummary(p));
    },
    [
      currentPage,
      rowsPerPage,
      searchInput,
      categoryFilter,
      selectedLocationId,
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

  useEffect(() => {
    dispatch(getCategoryDropdown());
  }, [dispatch]);

  // Re-fetch on filter change; debounce free-text search.
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
  }, [searchInput, categoryFilter, selectedLocationId, inStockOnly]);

  // The slice inverts `stockLoading` (false while a request is in flight),
  // so the overlay is ON only during the fetch.
  useEffect(() => {
    if (!store?.stockLoading) dispatch(startLoading());
    else dispatch(stopLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.stockLoading]);

  const categoryOptions = useMemo(
    () =>
      (categoryStore?.categoryDropdown || []).map((c) => ({
        value: c._id,
        label: c.name,
      })),
    [categoryStore?.categoryDropdown]
  );

  const rows = store?.stockItems || [];

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
      name: t("UOM"),
      center: true,
      selector: (row) => row?.uom || "—",
    },
    {
      name: t("On-Hand"),
      center: true,
      minWidth: "130px",
      selector: (row) => {
        const n = Number(row?.on_hand) || 0;
        return (
          <span
            className="fw-bold text-nowrap"
            style={{ color: n > 0 ? "#28c76f" : n < 0 ? "#ea5455" : "#6e6b7b" }}
          >
            {fmtQty(n)}
            {row?.uom ? ` ${row.uom}` : ""}
          </span>
        );
      },
    },
    {
      name: t("Last Movement"),
      center: true,
      minWidth: "140px",
      selector: (row) => (
        <span className="text-nowrap">
          {row?.last_movement ? formatDate(row.last_movement) : "-"}
        </span>
      ),
    },
    {
      name: t("Action"),
      center: true,
      cell: (row, index) => (
        <span
          className="cursor-pointer text-primary"
          id={`stock-view-${row?.product_id || index}`}
          onClick={() => setOpenProductId(row?.product_id)}
        >
          <Eye size={18} />
          <UncontrolledTooltip
            placement="top"
            target={`stock-view-${row?.product_id || index}`}
          >
            {t("Movement history")}
          </UncontrolledTooltip>
        </span>
      ),
    },
  ];

  return (
    <Fragment>
      <Row className="mb-1">
        <Col sm="6" md="3" className="mb-1 mb-md-0">
          <Input
            type="text"
            value={searchInput}
            placeholder={t("Search product")}
            onChange={(e) => setSearchInput(e?.target?.value)}
          />
        </Col>
        <Col sm="6" md="3" className="mb-1 mb-md-0">
          <Select
            isClearable
            classNamePrefix="select"
            placeholder={t("Category")}
            options={categoryOptions}
            value={
              categoryOptions.find((o) => o.value === categoryFilter) || null
            }
            onChange={(opt) => setCategoryFilter(opt ? opt.value : "")}
          />
        </Col>
        <Col sm="12" md="3" className="d-flex align-items-center">
          <div className="form-check form-switch">
            <Input
              type="switch"
              id="stock-in-stock-only"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            <Label className="form-check-label" for="stock-in-stock-only">
              {t("In stock only")}
            </Label>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md="12" className="inventory-tables">
          <DatatablePagination
            columns={columns}
            data={rows}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            pagination={store?.stockPagination}
            handleRowPerPage={handlePerPage}
            handlePagination={handlePagination}
          />
        </Col>
      </Row>

      <MovementHistoryModal
        isOpen={!!openProductId}
        productId={openProductId}
        toggle={() => setOpenProductId(null)}
      />
    </Fragment>
  );
};

export default StockSummary;
