// Compact quotations list for the lead detail page.
// Loads via the existing quotation list endpoint filtered by lead_id.

import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Button, UncontrolledTooltip, Badge, Input } from "reactstrap";
import { Edit, PlusCircle, FileText } from "react-feather";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";

import {
  getQuotationList,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";

const QUOTATION_STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  approved: "success",
  rejected: "danger",
};

const QuotationsPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const leadStore = useSelector((s) => s.lead);
  const [loaded, setLoaded] = useState(false);

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const quotationPerms = authUserItem?.role?.permissions?.quotations;
  const canAddQuotation =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_add;
  const canEditQuotation =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_update;

  const currentStatus = leadStore?.leadItem?.status;
  const canCreate =
    currentStatus && currentStatus !== "lost" && canAddQuotation;

  useEffect(() => {
    if (!id) return;
    dispatch(
      getQuotationList({
        orderBy: "quotation_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        lead_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanQuotationMessage(null));
    };
  }, [id, dispatch]);

  const rows = store?.quotationItems || [];

  // Client-side pagination (not a datatable) — same pattern as the line-item panels.
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

  // Reset to the first page when the lead changes.
  useEffect(() => {
    setPage(0);
  }, [id]);

  const createBtn = canCreate ? (
    <Button
      color="primary"
      size="sm"
      onClick={() => navigate(`${appsRoot}/quotations/add?lead_id=${id}`)}
    >
      <PlusCircle size={14} className="me-50" />
      {t("New")}
    </Button>
  ) : null;

  return (
    <DetailPanel title={t("Quotations")} action={createBtn}>
      {loaded && rows.length === 0 ? (
        <DetailEmptyState
          icon={FileText}
          title={t("No quotations yet")}
          description={
            canCreate
              ? t("Create the first quotation from this lead.")
              : t("This lead is closed.")
          }
        />
      ) : (
        <Fragment>
          <div className="table-responsive">
            <Table size="sm" bordered className="mb-0">
            <thead>
              <tr>
                <th>{t("Date")}</th>
                <th>{t("Quote #")}</th>
                <th>{t("Total")}</th>
                <th>{t("Status")}</th>
                <th className="text-center">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const sym = row?.currency_symbol || row?.currency_code || "";
                return (
                  <tr key={row?._id}>
                    <td>{row?.quotation_date ? formatDate(row.quotation_date) : "-"}</td>
                    <td className="text-wrap">{row?.voucher_no || "-"}</td>
                    <td>
                      {row?.grand_total !== null &&
                      row?.grand_total !== undefined
                        ? `${sym}${row.grand_total}`
                        : "-"}
                    </td>
                    <td>
                      <Badge
                        color={`light-${
                          QUOTATION_STATUS_COLOR[row?.status] || "secondary"
                        }`}
                        className="text-capitalize"
                      >
                        {row?.status || "-"}
                      </Badge>
                    </td>
                    <td className="text-center">
                      {canEditQuotation ? (
                        <>
                          <Link
                            to={`${appsRoot}/quotations/edit/${row?._id}`}
                            id={`lead-qt-edit-${row?._id}`}
                          >
                            <Edit size={16} />
                          </Link>
                          <UncontrolledTooltip
                            placement="top"
                            target={`lead-qt-edit-${row?._id}`}
                          >
                            {t("Open")}
                          </UncontrolledTooltip>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </Table>
          </div>

          {totalRows > pageSize && (
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
      )}
    </DetailPanel>
  );
};

export default QuotationsPanel;
