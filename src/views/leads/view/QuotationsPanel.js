// Compact quotations list for the lead detail page.
// Loads via the existing quotation list endpoint filtered by lead_id.

import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Button, UncontrolledTooltip, Badge } from "reactstrap";
import { Edit, PlusCircle, FileText, ExternalLink, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getQuotationList,
  deleteQuotation,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import Notification from "@components/toast/notification";

import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

const mySwal = withReactContent(Swal);

const QUOTATION_STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  approved: "success",
  rejected: "danger",
};

const QuotationsPanel = ({ embedded = false }) => {
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
  const canDeleteQuotation =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_delete;

  const currentStatus = leadStore?.leadItem?.status;
  const canCreate =
    currentStatus && currentStatus !== "lost" && canAddQuotation;

  const reload = () => {
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
  };

  useEffect(() => {
    reload();
    setLoaded(true);
    return () => {
      dispatch(cleanQuotationMessage(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  const onDelete = (qId) => {
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
          const payload = await dispatch(deleteQuotation(qId)).unwrap();
          if (payload?.error) {
            Notification("Error", payload.error, "warning");
          } else {
            Notification(
              "Success",
              payload?.success || t("Quotation deleted"),
              "success"
            );
            reload();
          }
        } catch (e) {
          Notification("Error", e?.message || t("Delete failed"), "warning");
        }
      });
  };

  const rows = store?.quotationItems || [];

  // Client-side pagination (not a datatable) — same pattern as the line-item panels.
  const pg = usePagination(rows.length);
  const totalRows = rows.length;
  const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  // Reset to the first page when the lead changes.
  useEffect(() => {
    pg.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const content =
    loaded && rows.length === 0 ? (
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
                <th style={{ width: 30 }}>#</th>
                <th>{t("Date")}</th>
                <th>{t("Quote #")}</th>
                <th>{t("Total")}</th>
                <th>{t("Status")}</th>
                <th className="text-center">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, idx) => {
                const sym = row?.currency_symbol || row?.currency_code || "";
                return (
                  <tr key={row?._id}>
                    <td>{pg.pageStart + idx + 1}</td>
                    <td>{row?.quotation_date ? formatDate(row.quotation_date) : "-"}</td>
                    <td className="text-wrap">
                      <Link
                        to={`${appsRoot}/quotations/view/${row?._id}`}
                        className="text-primary fw-semibold d-inline-flex align-items-center"
                      >
                        {row?.voucher_no || "-"}
                        <ExternalLink size={13} className="ms-50" />
                      </Link>
                      {row?.rfq_id && row?.rfq_voucher_no ? (
                        <div className="small mt-25">
                          <Link
                            to={`${appsRoot}/rfq/view/${row.rfq_id}`}
                            className="text-muted d-inline-flex align-items-center"
                          >
                            {row.rfq_voucher_no}
                            <ExternalLink size={12} className="ms-50" />
                          </Link>
                        </div>
                      ) : null}
                    </td>
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
                        pill
                      >
                        {row?.status || "-"}
                      </Badge>
                    </td>
                    <td className="text-center">
                      {canEditQuotation && (
                        <>
                          <Link
                            to={`${appsRoot}/quotations/edit/${row?._id}`}
                            id={`lead-qt-edit-${row?._id}`}
                            className="me-1"
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
                      )}
                      {canDeleteQuotation && (
                        <>
                          <Trash2
                            size={16}
                            className="cursor-pointer text-danger"
                            id={`lead-qt-del-${row?._id}`}
                            onClick={() => onDelete(row?._id)}
                          />
                          <UncontrolledTooltip
                            placement="top"
                            target={`lead-qt-del-${row?._id}`}
                          >
                            {t("Delete")}
                          </UncontrolledTooltip>
                        </>
                      )}
                      {!canEditQuotation && !canDeleteQuotation && "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </Table>
          </div>

          <TablePaginationBar {...pg} totalRows={totalRows} />
        </Fragment>
      );

  // Embedded (inside the docs tab view): render the action + content without
  // the card/title wrapper.
  if (embedded) {
    // The "Quote" shortcut lives on the tab bar in the embedded (tabbed) view.
    return <Fragment>{content}</Fragment>;
  }

  return (
    <DetailPanel title={t("Quotations")} action={createBtn}>
      {content}
    </DetailPanel>
  );
};

export default QuotationsPanel;
