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
import { Paperclip, ExternalLink } from "react-feather";

import {
  getTrackingEventList,
  cleanTrackingEventMessage,
} from "./store";
import { getVendorDropdown } from "../vendors/store";
import { startLoading, stopLoading } from "../loadingstore";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";

import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import { TRACKING_EVENT_TYPE_OPTIONS } from "@constant/options";

const fmtWhen = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso).slice(0, 16);
  }
};

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
      (vendorStore?.vendorDropdown || []).map((v) => ({
        value: v._id,
        label: v.name,
      })),
    [vendorStore?.vendorDropdown]
  );

  const columns = [
    {
      name: t("When"),
      sortable: false,
      selector: (row) => (
        <span className="text-nowrap small">{fmtWhen(row?.event_at)}</span>
      ),
    },
    {
      name: t("POV #"),
      sortable: false,
      selector: (row) => {
        if (!row?.po_vendor_voucher_no) return "-";
        return (
          <Link
            to={`${appsRoot}/po-vendors/view/${row.po_vendor_id}#tracking-event-${row._id}`}
            className="text-wrap d-inline-flex align-items-center"
          >
            <span>{row.po_vendor_voucher_no}</span>
            <ExternalLink size={12} className="ms-50" />
          </Link>
        );
      },
    },
    {
      name: t("PO #"),
      sortable: false,
      selector: (row) =>
        row?.purchase_order_voucher_no ? (
          <Link
            to={`${appsRoot}/purchase-orders/view/${row.purchase_order_id}`}
            className="text-wrap"
          >
            {row.purchase_order_voucher_no}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      name: t("Vendor"),
      sortable: false,
      selector: (row) => (
        <span className="text-capitalize">{row?.vendor_name || "-"}</span>
      ),
    },
    {
      name: t("Event"),
      sortable: false,
      selector: (row) => {
        const retracted = !!row?.soft_delete;
        return (
          <span
            className="text-nowrap"
            id={retracted ? `feed-retracted-${row._id}` : undefined}
            style={
              retracted ? { textDecoration: "line-through", opacity: 0.6 } : undefined
            }
          >
            {row?.event_type_label || row?.event_type || "-"}
            {row?.is_post_closure && !retracted && (
              <Badge color="light-warning" className="ms-50">
                {t("Post-closure")}
              </Badge>
            )}
            {retracted && (
              <Fragment>
                <Badge color="light-secondary" className="ms-50">
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
          </span>
        );
      },
    },
    {
      name: t("Location"),
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
      sortable: false,
      selector: (row) => row?.created_by_name || "-",
    },
    {
      name: t("File"),
      center: true,
      sortable: false,
      selector: (row) =>
        row?.attachment_url ? (
          <a
            href={row.attachment_url}
            target="_blank"
            rel="noreferrer"
            id={`tev-att-${row._id}`}
          >
            <Paperclip size={16} />
            <UncontrolledTooltip
              placement="top"
              target={`tev-att-${row._id}`}
            >
              {t("Open attachment")}
            </UncontrolledTooltip>
          </a>
        ) : (
          ""
        ),
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
                    vendorOptions.find((o) => o.value === vendorFilter) || null
                  }
                  onChange={(opt) => setVendorFilter(opt ? opt.value : "")}
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

            <Row className="mt-2">
              <Col md="12" className="tracking-feed-table">
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
