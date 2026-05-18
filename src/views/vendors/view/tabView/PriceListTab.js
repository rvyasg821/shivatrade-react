// Vendor's price list tab. Reuses existing /admin/price-list/list with
// vendor_id filter — no new BE endpoint needed.

import { Fragment, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Badge, Button, Table, UncontrolledTooltip } from "reactstrap";
import { Edit, PlusCircle } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPriceListList,
  cleanPriceListMessage,
} from "@src/views/price-list/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";

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
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(
      getPriceListList({
        orderBy: "effective_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        vendor_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanPriceListMessage(null));
    };
  }, [id, dispatch]);

  const rows = store?.priceListItems || [];

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">{t("Price List")}</h4>
        {canAdd && (
          <Button
            color="primary"
            size="sm"
            onClick={() =>
              navigate(`${appsRoot}/price-list/add?vendor_id=${id}`)
            }
          >
            <PlusCircle size={14} /> {t("Add Price")}
          </Button>
        )}
      </div>

      {loaded && rows.length === 0 ? (
        <div className="text-muted py-3 text-center">
          {t("No prices recorded for this vendor yet.")}
        </div>
      ) : (
        <Table responsive bordered className="mb-0">
          <thead>
            <tr>
              <th>{t("Product")}</th>
              <th>{t("Price")}</th>
              <th>{t("Lead Time")}</th>
              <th>{t("Effective Date")}</th>
              <th>{t("Valid Until")}</th>
              {canEdit && <th className="text-center">{t("Action")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sym = row?.currency_symbol || row?.currency_code || "";
              const price =
                row?.unit_price !== null && row?.unit_price !== undefined
                  ? `${sym}${row.unit_price}`
                  : "-";
              return (
                <tr key={row?._id}>
                  <td style={{ minWidth: 200, whiteSpace: "normal" }}>
                    {row?.product_code
                      ? `${row.product_code} - ${row.product_name}`
                      : row?.product_name || "-"}
                  </td>
                  <td>{price}</td>
                  <td>
                    {row?.lead_time_days
                      ? `${row.lead_time_days} ${t("days")}`
                      : "-"}
                  </td>
                  <td>{(row?.effective_date || "").slice(0, 10) || "-"}</td>
                  <td>
                    {row?.effective_until ? (
                      row?.valid_until ? (
                        (row.effective_until || "").slice(0, 10)
                      ) : (
                        <span className="text-muted fst-italic">
                          until {(row.effective_until || "").slice(0, 10)}
                        </span>
                      )
                    ) : (
                      <span className="text-muted">{t("Active")}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="text-center">
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
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Fragment>
  );
};

export default PriceListTab;
