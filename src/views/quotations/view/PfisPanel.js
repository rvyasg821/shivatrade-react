// PFIs spawned from this quotation. Reuses GET /admin/pfi/list?quotation_id=.

import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Button, UncontrolledTooltip, Badge } from "reactstrap";
import { Eye, PlusCircle, FileText } from "react-feather";
import { useTranslation } from "react-i18next";

import { getPfiList, cleanPfiMessage } from "@src/views/pfi/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { fmt, num } from "@src/views/_shared/sales-doc/_helpers";
import { useQuotationCurrency } from "./CurrencyToggleContext";

import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";

const PFI_STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  approved: "success",
  rejected: "danger",
  closed: "secondary",
};

const PfisPanel = ({ bare = false }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pfiStore = useSelector((s) => s.pfi);
  const [loaded, setLoaded] = useState(false);

  // Currency-view toggle from the detail page: OFF → totals shown in the
  // base currency (INR); ON → each PFI's own currency.
  const { showDoc, baseCurrency } = useQuotationCurrency();

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const pfiPerms = authUserItem?.role?.permissions?.pfi;
  const canAddPfi = isAdmin || pfiPerms?.can_all || pfiPerms?.can_add;

  // Show the "+ New PFI" button whenever the user has permission —
  // status-based restrictions live on the server / dest form, not the
  // entry point.
  const canCreate = canAddPfi;

  useEffect(() => {
    if (!id) return;
    dispatch(
      getPfiList({
        orderBy: "pfi_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        quotation_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanPfiMessage());
    };
  }, [id, dispatch]);

  const rows = pfiStore?.pfiItems || [];

  const createBtn = canCreate ? (
    <Button
      color="primary"
      size="sm"
      onClick={() => navigate(`${appsRoot}/pfi/add?quotation_id=${id}`)}
    >
      <PlusCircle size={14} className="me-50" />
      {t("New PFI")}
    </Button>
  ) : null;

  const body = (
    <Fragment>
      {loaded && rows.length === 0 ? (
        <DetailEmptyState
          icon={FileText}
          title={t("No PFIs yet")}
          description={
            canCreate
              ? t("Create a PFI from this approved quotation.")
              : t("PFIs can be created once the quotation is approved.")
          }
          cta={null}
        />
      ) : (
        <div className="table-responsive">
          <Table bordered size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t("Date")}</th>
                <th>{t("PFI #")}</th>
                <th>{t("Total")}</th>
                <th>{t("Status")}</th>
                <th className="text-center">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const sym = row?.currency_symbol || row?.currency_code || "";
                const statusKey = (row?.status || "").toLowerCase();
                // grand_total is stored in the PFI's own currency
                // (INR × exchange_rate). Re-derive INR for the base view.
                const hasTotal =
                  row?.grand_total !== null &&
                  row?.grand_total !== undefined;
                const rowRate = num(row?.exchange_rate) || 1;
                const totalCell = !hasTotal
                  ? "-"
                  : showDoc
                  ? `${sym}${fmt(num(row.grand_total))}`
                  : `${baseCurrency.symbol}${fmt(
                      num(row.grand_total) / rowRate
                    )}`;
                return (
                  <tr key={row?._id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>{row?.pfi_date ? formatDate(row.pfi_date) : "-"}</td>
                    <td className="text-wrap">{row?.voucher_no || "-"}</td>
                    <td>{totalCell}</td>
                    <td>
                      <Badge
                        color={`light-${
                          PFI_STATUS_COLOR[statusKey] || "secondary"
                        }`}
                        className="text-capitalize"
                      >
                        {row?.status || "-"}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Link
                        to={`${appsRoot}/pfi/view/${row?._id}`}
                        id={`qt-pfi-open-${row?._id}`}
                      >
                        <Eye size={18} />
                      </Link>
                      <UncontrolledTooltip
                        placement="top"
                        target={`qt-pfi-open-${row?._id}`}
                      >
                        {t("View")}
                      </UncontrolledTooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Fragment>
  );

  if (bare) {
    return (
      <Fragment>
        {createBtn ? (
          <div className="d-flex justify-content-end mb-2">{createBtn}</div>
        ) : null}
        {body}
      </Fragment>
    );
  }
  return (
    <DetailPanel title={t("PFIs")} action={createBtn}>
      {body}
    </DetailPanel>
  );
};

export default PfisPanel;
