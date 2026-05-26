// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  deletePriceList,
  getPriceListList,
  cleanPriceListMessage,
} from "./store";
import { getVendorDropdown } from "../vendors/store";
import { getProductDropdown } from "../products/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap
import {
  Col,
  Row,
  Card,
  Badge,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

// ** Custom
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Trash2, PlusCircle, Upload, Download } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";

// ** Import/Export
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportModal from "./components/ImportModal";

const PriceListView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.priceList);
  const vendorStore = useSelector((state) => state.vendor);
  const productStore = useSelector((state) => state.product);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("effective_date");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      vendorId = vendorFilter,
      productId = productFilter,
    ) => {
      const params = {
        orderBy: sortCol,
        orderDirection: sorting,
        page,
        perPage,
        search,
      };
      if (vendorId) params.vendor_id = vendorId;
      if (productId) params.product_id = productId;
      dispatch(getPriceListList(params));
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      vendorFilter,
      productFilter,
      dispatch,
    ],
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleList(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleList(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.priceList.export, {
        responseType: "blob",
      });
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

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getProductDropdown());
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleList(
          sort,
          sortColumn,
          1,
          rowsPerPage,
          searchInput,
          vendorFilter,
          productFilter,
        );
      }, 500);
    } else {
      handleList(
        sort,
        sortColumn,
        1,
        rowsPerPage,
        searchInput,
        vendorFilter,
        productFilter,
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, vendorFilter, productFilter]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanPriceListMessage(null));
    }
    if (store?.actionFlag === "PL_DLT") handleList();
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) dispatch(deletePriceList(id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["price-list"];
  const canRead = isAdmin || perms?.can_all || perms?.can_read;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const vendorOptions = useMemo(
    () =>
      (vendorStore?.vendorDropdown || []).map((v) => ({
        value: v._id,
        label: v.vendor_code
          ? `${v.company_name} [${v.vendor_code}]`
          : v.company_name,
      })),
    [vendorStore?.vendorDropdown],
  );

  const productOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code} - ${p.name}`,
      })),
    [productStore?.productDropdown],
  );

  const formatNumber = (v) =>
    v !== null && v !== undefined && v !== "" ? Number(v).toString() : "-";

  const columns = [
    {
      name: t("Vendor"),
      sortField: "vendor_id",
      sortable: false,
      selector: (row) => {
        const label = row?.vendor_code
          ? `${row.vendor_name || "-"} [${row.vendor_code}]`
          : row?.vendor_name || "-";
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/price-list/edit/${row?._id || ""}`}
              className="text-wrap"
            >
              {label}
            </Link>
          );
        }
        return <span className="text-wrap">{label}</span>;
      },
    },
    {
      name: t("Product"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap">
          {row?.product_code
            ? `${row.product_code} - ${row.product_name}`
            : row?.product_name || "-"}
        </span>
      ),
    },
    {
      name: t("Price"),
      sortable: false,
      selector: (row) => {
        const sym = row?.currency_symbol || row?.currency_code || "";
        const amt = formatNumber(row?.unit_price);
        return sym ? `${sym}${amt}` : amt;
      },
    },
    {
      name: t("Lead Time"),
      sortable: false,
      selector: (row) =>
        row?.lead_time_days ? `${row.lead_time_days} ${t("days")}` : "-",
    },
    {
      name: t("Effective Date"),
      sortField: "effective_date",
      sortable: true,
      selector: (row) => (row?.effective_date || "").slice(0, 10),
    },
    {
      name: t("Valid Until"),
      sortable: false,
      selector: (row) => {
        const end = row?.effective_until;
        if (!end) return <span className="text-muted">{t("Active")}</span>;
        const endDate = String(end).slice(0, 10);
        // Explicit valid_until → just the date.
        // Derived (auto-end when next row takes effect) → italic, prefixed.
        return row?.valid_until ? (
          endDate
        ) : (
          <span className="text-muted fst-italic">until {endDate}</span>
        );
      },
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          {canEdit && (
            <Link
              className="me-50"
              id={`pl-edit-${row?._id || ""}`}
              to={`${appsRoot}/price-list/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`pl-edit-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`pl-delete-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`pl-delete-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    });
  }

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content price-list">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Price List")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="7" md="7">
                <Row>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-pl"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search by vendor / product / notes")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Filter by Vendor")}
                      options={vendorOptions}
                      value={
                        vendorOptions.find((o) => o.value === vendorFilter) ||
                        null
                      }
                      onChange={(opt) => setVendorFilter(opt ? opt.value : "")}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
                    />
                  </Col>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Filter by Product")}
                      options={productOptions}
                      value={
                        productOptions.find((o) => o.value === productFilter) ||
                        null
                      }
                      onChange={(opt) => setProductFilter(opt ? opt.value : "")}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="5" md="5">
                <div className="d-flex gap-1 justify-content-end flex-nowrap">
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

                      className="text-nowrap"
                      onClick={() => navigate(`${appsRoot}/price-list/add`)}
                    >
                      <PlusCircle size={14} className="me-50" />{t("Add")}
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col md="12" className="price-list-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.priceListItems || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={store?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen((prev) => !prev)}
        onSuccess={() => handleList()}
      />
    </Fragment>
  );
};

export default PriceListView;
