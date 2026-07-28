// Compact RFQ list for the lead detail page.
// Loads via the existing RFQ list endpoint filtered by lead_id. Read-only —
// no "New" button (RFQs are started from the Requirement Items table).

import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip, Badge, Input } from "reactstrap";
import { Eye, Send, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { getRfqList, deleteRfq } from "@src/views/rfq/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import Notification from "@components/toast/notification";

import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";

const mySwal = withReactContent(Swal);

const RFQ_STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  quoting: "warning",
  completed: "success",
  cancelled: "danger",
};

const RfqsPanel = ({ embedded = false }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.rfq);
  const [loaded, setLoaded] = useState(false);

  const reload = () => {
    if (!id) return;
    dispatch(
      getRfqList({
        orderBy: "rfq_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        lead_id: id,
      })
    );
  };

  useEffect(() => {
    reload();
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  const onDelete = (rfqId) => {
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
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          const payload = await dispatch(deleteRfq(rfqId)).unwrap();
          if (payload?.error) {
            Notification("Error", payload.error, "warning");
          } else {
            Notification("Success", payload?.success || t("RFQ deleted"), "success");
            reload();
          }
        } catch (e) {
          Notification("Error", e?.message || t("Delete failed"), "warning");
        }
      });
  };

  const rows = store?.rfqItems || [];

  // Client-side pagination (not a datatable) — same pattern as Quotations.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  useEffect(() => {
    setPage(0);
  }, [id]);

  const content =
    loaded && rows.length === 0 ? (
      <DetailEmptyState
        icon={Send}
        title={t("No RFQs yet")}
        description={t("Create an RFQ from the Requirement Items above.")}
      />
    ) : (
      <Fragment>
        <div className="table-responsive">
          <Table size="sm" bordered className="mb-0">
            <thead>
              <tr>
                <th>{t("RFQ #")}</th>
                <th>{t("Date")}</th>
                <th className="text-center">{t("Vendors")}</th>
                <th>{t("Status")}</th>
                <th className="text-center">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row?._id}>
                  <td className="text-wrap">
                    {row?._id ? (
                      <Link
                        to={`${appsRoot}/rfq/view/${row._id}`}
                        style={{ color: "#09418B", fontWeight: 500 }}
                      >
                        {row?.voucher_no || "-"}
                      </Link>
                    ) : (
                      row?.voucher_no || "-"
                    )}
                  </td>
                  <td>{row?.rfq_date ? formatDate(row.rfq_date) : "-"}</td>
                  <td className="text-center">{row?.vendor_count ?? 0}</td>
                  <td>
                    <Badge
                      color={`light-${
                        RFQ_STATUS_COLOR[row?.status] || "secondary"
                      }`}
                      className="text-capitalize"
                      pill
                    >
                      {row?.status || "-"}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/rfq/view/${row?._id}`}
                      id={`lead-rfq-view-${row?._id}`}
                      className="me-1"
                    >
                      <Eye size={16} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`lead-rfq-view-${row?._id}`}
                    >
                      {t("View")}
                    </UncontrolledTooltip>
                    <Trash2
                      size={16}
                      className="cursor-pointer text-danger"
                      id={`lead-rfq-del-${row?._id}`}
                      onClick={() => onDelete(row?._id)}
                    />
                    <UncontrolledTooltip
                      placement="top"
                      target={`lead-rfq-del-${row?._id}`}
                    >
                      {t("Delete")}
                    </UncontrolledTooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {totalRows > 0 && (
          <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
            <div className="d-flex align-items-center small text-muted">
              <span className="me-50">{t("Show")}</span>
              <Input
                type="select"
                bsSize="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(0);
                }}
                style={{ width: 80 }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span className="ms-50">
                {t("of")} {totalRows} {t("rows")}
              </span>
            </div>
            <ReactPaginate
              previousLabel=""
              nextLabel=""
              pageCount={pageCount}
              activeClassName="active"
              forcePage={safePage}
              onPageChange={({ selected }) => setPage(selected)}
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
      </Fragment>
    );

  if (embedded) return content;

  return <DetailPanel title={t("RFQs")}>{content}</DetailPanel>;
};

export default RfqsPanel;
