// RFQ (Vendor Sourcing) — list page.
import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Table,
  Badge,
  Button,
} from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import { getRfqList } from "./store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

const STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  quoting: "warning",
  completed: "success",
  cancelled: "danger",
};

const RfqList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.rfq);
  const rows = store?.rfqItems || [];

  useEffect(() => {
    dispatch(getRfqList());
  }, [dispatch]);

  return (
    <Fragment>
      <Card>
        <CardHeader>
          <CardTitle tag="h4">{t("RFQ — Vendor Sourcing")}</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <div className="table-responsive">
            <Table className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>{t("RFQ No")}</th>
                  <th>{t("Lead")}</th>
                  <th>{t("Date")}</th>
                  <th className="text-center">{t("Items")}</th>
                  <th className="text-center">{t("Vendors")}</th>
                  <th>{t("Status")}</th>
                  <th className="text-center">{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      {t("No RFQs yet. Create one from a lead's requirement items.")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r._id}>
                      <td className="fw-bold">{r.voucher_no || "-"}</td>
                      <td>{r.lead_voucher_no || "-"}</td>
                      <td>{r.rfq_date ? formatDate(r.rfq_date) : "-"}</td>
                      <td className="text-center">{r.line_count ?? 0}</td>
                      <td className="text-center">{r.vendor_count ?? 0}</td>
                      <td>
                        <Badge
                          color={`light-${STATUS_COLOR[r.status] || "secondary"}`}
                          className="text-capitalize"
                        >
                          {r.status || "-"}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button
                          tag={Link}
                          to={`${appsRoot}/rfq/view/${r._id}`}
                          size="sm"
                          color="flat-primary"
                        >
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default RfqList;
