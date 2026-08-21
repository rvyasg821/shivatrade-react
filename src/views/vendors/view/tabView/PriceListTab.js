// Vendor's price list tab. Reuses existing /admin/price-list/list with
// vendor_id filter — no new BE endpoint needed.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, UncontrolledTooltip } from "reactstrap";
import EntitySearchSelect from "@components/entity-select";
import { Edit, PlusCircle, Upload, Download, Clock } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPriceListList,
  cleanPriceListMessage,
} from "@src/views/price-list/store";
import DatatablePagination from "@components/datatable/DatatablePagination";
import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import ImportModal from "@src/views/price-list/components/ImportModal";
import PriceHistoryModal from "@src/views/price-list/components/PriceHistoryModal";

const PriceListTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const store = useSelector((s) => s.priceList);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["price-list"];
  const canRead = isAdmin || perms?.can_all || perms?.can_read;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("effective_date");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [productFilter, setProductFilter] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Per-row price history modal target: { productId, title } | null.
  const [historyTarget, setHistoryTarget] = useState(null);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await instance.get(
        `${API_ENDPOINTS.priceList.export}?vendor_id=${id}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `price-list-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export price list"), "warning");
    } finally {
      setExporting(false);
    }
  };

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      productId = productFilter
    ) => {
      if (!id) return;
      const params = {
        orderBy: sortCol,
        orderDirection: sorting,
        page,
        perPage,
        search: "",
        vendor_id: id,
      };
      if (productId) params.product_id = productId;
      params.current = 1; // current price per product (history via row icon)
      dispatch(getPriceListList(params));
    },
    [id, sort, sortColumn, currentPage, rowsPerPage, productFilter, dispatch]
  );

  useEffect(() => {
    return () => {
      dispatch(cleanPriceListMessage(null));
    };
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, rowsPerPage, productFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, productFilter]);


  const rows = store?.priceListItems || [];

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleList(sortDirection, column.sortField, 1, rowsPerPage, productFilter);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleList(sort, sortColumn, page + 1, rowsPerPage, productFilter);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, value, productFilter);
  };

  const columns = [
    {
      name: t("Product"),
      sortField: "product_name",
      sortable: false,
      minWidth: "220px",
      selector: (row) =>
        row?.product_code
          ? `${row.product_code} - ${row.product_name}`
          : row?.product_name || "-",
    },
    {
      name: t("Price"),
      sortField: "unit_price",
      sortable: true,
      selector: (row) => {
        const sym = row?.currency_symbol || row?.currency_code || "";
        return row?.unit_price !== null && row?.unit_price !== undefined
          ? `${sym}${row.unit_price}`
          : "-";
      },
    },
    {
      name: t("Lead Time"),
      sortField: "lead_time_days",
      sortable: true,
      selector: (row) =>
        row?.lead_time_days ? `${row.lead_time_days} ${t("days")}` : "-",
    },
    {
      name: t("Effective Date"),
      sortField: "effective_date",
      sortable: true,
      selector: (row) =>
        row?.effective_date ? formatDate(row.effective_date) : "-",
    },
    {
      name: t("Valid Until"),
      sortField: "effective_until",
      sortable: false,
      selector: (row) =>
        row?.effective_until ? formatDate(row.effective_until) : t("Active"),
    },
  ];

  columns.push({
    name: t("Action"),
    sortable: false,
    center: true,
    selector: (row) => (
      <Fragment>
        <span
          className="me-50 cursor-pointer"
          id={`vview-pl-history-${row?._id}`}
          onClick={() =>
            setHistoryTarget({
              productId: row?.product_id,
              title: `${row?.product_code ? `${row.product_code} · ` : ""}${
                row?.product_name || ""
              }`,
            })
          }
        >
          <Clock size={18} />
        </span>
        <UncontrolledTooltip
          placement="top"
          target={`vview-pl-history-${row?._id}`}
        >
          {t("Price History")}
        </UncontrolledTooltip>
        {canEdit && (
          <Fragment>
            <Link
              to={`${appsRoot}/price-list/edit/${row?._id || ""}?vendor_id=${id}`}
              id={`vview-pl-edit-${row?._id}`}
            >
              <Edit size={18} />
            </Link>
            <UncontrolledTooltip
              placement="top"
              target={`vview-pl-edit-${row?._id}`}
            >
              {t("Edit")}
            </UncontrolledTooltip>
          </Fragment>
        )}
      </Fragment>
    ),
  });

  return (
    <Fragment>
      {/* Single header row: product filter on the left (where the title
          used to sit), action buttons on the right. */}
      <div className="d-flex align-items-center flex-nowrap gap-2 mb-2">
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <EntitySearchSelect
            kind="product"
            placeholder={t("Filter by Product")}
            isClearable
            value={productFilter || null}
            onChange={(opt) => setProductFilter(opt ? opt.value : "")}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
          />
        </div>
        <div className="d-flex align-items-center justify-content-end gap-1 flex-shrink-0">
            {canRead && (
              <Button
                color="outline-secondary"
                size="sm"
                className="text-nowrap"
                onClick={handleExport}
                disabled={exporting}
              >
                {t("Export")} <Download size={14} />
              </Button>
            )}
            {(canAdd || canEdit) && (
              <Button
                color="outline-secondary"
                size="sm"
                className="text-nowrap"
                onClick={() => setImportModalOpen(true)}
              >
                {t("Import")} <Upload size={14} />
              </Button>
            )}
            {canAdd && (
              <Button
                color="primary"
                size="sm"
                className="text-nowrap"
                onClick={() =>
                  navigate(`${appsRoot}/price-list/add?vendor_id=${id}`)
                }
              >
                <PlusCircle size={14} /> {t("Add Price")}
              </Button>
            )}
        </div>
      </div>

      <DatatablePagination
        columns={columns}
        data={rows}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        pagination={store?.pagination}
        handleSort={handleSort}
        handleRowPerPage={handlePerPage}
        handlePagination={handlePagination}
      />

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen((prev) => !prev)}
        vendorId={id}
        onSuccess={() => handleList()}
      />

      <PriceHistoryModal
        open={!!historyTarget}
        toggle={() => setHistoryTarget(null)}
        vendorId={id}
        productId={historyTarget?.productId}
        title={historyTarget?.title}
      />
    </Fragment>
  );
};

export default PriceListTab;
