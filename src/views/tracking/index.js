// Tracking - cross-POV ops feed (Tracking plan §12).
// Read-only listing. Events are append-only; no add/edit/delete here.

import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Col,
  Row,
  Card,
  Input,
  CardBody,
  Badge,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import {
  getTrackingEventList,
  cleanTrackingEventMessage,
} from "./store";
import { getVendorDropdown } from "../vendors/store";
import { startLoading, stopLoading } from "../loadingstore";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";
import { formatDate, formatTime } from "@src/utility/dateFormat";

import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { TRACKING_EVENT_TYPE_OPTIONS } from "@constant/options";

const TrackingFeedView = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingEvent);
  const vendorStore = useSelector((s) => s.vendor);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleList = useCallback(
    (
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      vendorId = vendorFilter,
      eventType = eventTypeFilter,
      from = dateFrom,
      to = dateTo
    ) => {
      const params = { page, perPage, search };
      if (vendorId) params.vendor_id = vendorId;
      if (eventType) params.event_type = eventType;
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      dispatch(getTrackingEventList(params));
    },
    [
      currentPage,
      rowsPerPage,
      searchInput,
      vendorFilter,
      eventTypeFilter,
      dateFrom,
      dateTo,
      dispatch,
    ]
  );

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleList(page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(1, value, searchInput);
  };

  useLayoutEffect(() => {
    dispatch(getVendorDropdown());
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleList(
          1,
          rowsPerPage,
          searchInput,
          vendorFilter,
          eventTypeFilter,
          dateFrom,
          dateTo
        );
      }, 500);
    } else {
      handleList(
        1,
        rowsPerPage,
        searchInput,
        vendorFilter,
        eventTypeFilter,
        dateFrom,
        dateTo
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, vendorFilter, eventTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanTrackingEventMessage());
    }
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
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

  const selectMenuPortalProps = {
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    styles: { menuPortal: (b) => ({ ...b, zIndex: 9999 }) },
  };

  const columns = [
    {
      name: t("When"),
      hide: "md",
      sortable: false,
      minWidth: "170px",
      selector: (row) => {
        if (!row?.event_at) return "-";
        return (
          <div className="py-1">
            <div className="text-nowrap">{formatDate(row.event_at)}</div>
            <div className="small text-muted text-nowrap mt-25">
              {formatTime(row.event_at)}
            </div>
          </div>
        );
      },
    },
    {
      name: t("POV #"),
      sortable: false,
      minWidth: "220px",
      grow: 1.6,
      selector: (row) => (
        <div className="py-1">
          {row?.po_vendor_voucher_no ? (
            <Link
              to={`${appsRoot}/po-vendors/view/${row.po_vendor_id}#tracking-event-${row._id}`}
              className="text-nowrap d-block"
            >
              {row.po_vendor_voucher_no}
            </Link>
          ) : (
            "-"
          )}
          {row?.purchase_order_voucher_no ? (
            <div className="mt-1">
              {row?.purchase_order_id ? (
                <Link
                  to={`${appsRoot}/purchase-orders/view/${row.purchase_order_id}`}
                  className="small text-muted text-nowrap d-inline-flex align-items-center"
                >
                  PO - {row.purchase_order_voucher_no}
                  <ExternalLink size={12} className="ms-1" />
                </Link>
              ) : (
                <span className="small text-muted text-nowrap">
                  PO - {row.purchase_order_voucher_no}
                </span>
              )}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      name: t("Vendor"),
      sortable: false,
      grow: 2,
      selector: (row) => (
        <div className="py-1">
          {row?.vendor_id ? (
            <Link
              to={`${appsRoot}/vendors/view/${row.vendor_id}`}
              className="fw-bold text-capitalize"
            >
              {row?.vendor_name || "-"}
            </Link>
          ) : (
            <span className="fw-bold text-capitalize">
              {row?.vendor_name || "-"}
            </span>
          )}
          {row?.vendor_code && (
            <div className="small text-muted">{row.vendor_code}</div>
          )}
        </div>
      ),
    },
    {
      name: t("Event"),
      sortable: false,
      minWidth: "170px",
      selector: (row) => {
        const retracted = !!row?.soft_delete;
        return (
          <div className="py-1" id={retracted ? `feed-retracted-${row._id}` : undefined}>
            <div
              className="text-wrap"
              style={
                retracted
                  ? { textDecoration: "line-through", opacity: 0.6 }
                  : undefined
              }
            >
              {row?.event_type_label || row?.event_type || "-"}
            </div>
            {row?.is_post_closure && !retracted && (
              <Badge color="light-warning" className="mt-25 d-inline-block">
                {t("Post-closure")}
              </Badge>
            )}
            {retracted && (
              <Fragment>
                <Badge color="light-secondary" className="mt-25 d-inline-block">
                  {t("Retracted")}
                </Badge>
                <UncontrolledTooltip
                  placement="top"
                  target={`feed-retracted-${row._id}`}
                >
                  {`${t("Retracted by")} ${
                    row.deleted_by_name || t("user")
                  }${row.deleted_reason ? ` — ${row.deleted_reason}` : ""}`}
                </UncontrolledTooltip>
              </Fragment>
            )}
          </div>
        );
      },
    },
    {
      name: t("Location"),
      hide: "md",
      sortable: false,
      selector: (row) => (
        <span
          style={
            row?.soft_delete
              ? { textDecoration: "line-through", opacity: 0.6 }
              : undefined
          }
        >
          {row?.location || "-"}
        </span>
      ),
    },
    {
      name: t("Notes"),
      hide: "md",
      sortable: false,
      grow: 2,
      selector: (row) => {
        if (!row?.notes) return "-";
        const truncated =
          row.notes.length > 60 ? `${row.notes.slice(0, 60)}…` : row.notes;
        return (
          <span
            id={`tev-notes-${row._id}`}
            className="text-wrap small"
            style={{ cursor: "default" }}
          >
            {truncated}
            {row.notes.length > 60 ? (
              <UncontrolledTooltip
                placement="top"
                target={`tev-notes-${row._id}`}
              >
                {row.notes}
              </UncontrolledTooltip>
            ) : null}
          </span>
        );
      },
    },
    {
      name: t("Added by"),
      hide: "md",
      sortable: false,
      selector: (row) => row?.created_by_name || "-",
    },
  ];

  return (
    <Fragment>
      <div className="main-content tracking-feed">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Tracking")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="12" md="12">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-tracking"
                      value={searchInput}
                      className="w-100"
                      placeholder={t("Search location / notes")}
                      onChange={(e) => setSearchInput(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Filter by Vendor")}
                      options={vendorOptions}
                      value={
                        vendorOptions.find((o) => o.value === vendorFilter) ||
                        null
                      }
                      onChange={(opt) =>
                        setVendorFilter(opt ? opt.value : "")
                      }
                      {...selectMenuPortalProps}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <Select
                      isClearable
                      classNamePrefix="select"
                      placeholder={t("Event Type")}
                      options={TRACKING_EVENT_TYPE_OPTIONS}
                      value={
                        TRACKING_EVENT_TYPE_OPTIONS.find(
                          (o) => o.value === eventTypeFilter
                        ) || null
                      }
                      onChange={(opt) =>
                        setEventTypeFilter(opt ? opt.value : "")
                      }
                      {...selectMenuPortalProps}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="tracking-date-from"
                      value={dateFrom}
                      onChange={(dates, str, iso) => setDateFrom(iso)}
                      placeholder={t("From")}
                    />
                  </Col>
                  <Col sm="6" md="2" className="mb-2 mb-md-0">
                    <DateInput
                      id="tracking-date-to"
                      value={dateTo}
                      onChange={(dates, str, iso) => setDateTo(iso)}
                      placeholder={t("To")}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="pov-tables tracking-feed-table">
                <DatatablePagination
                  columns={columns}
                  data={store?.trackingEventItems || []}
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
    </Fragment>
  );
};

export default TrackingFeedView;
