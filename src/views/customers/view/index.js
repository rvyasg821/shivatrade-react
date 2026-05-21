// Customer detail page — composes the shared detail-page kit.
// Layout:
//   1. Header (sticky) — avatar, company, status, edit/back
//   2. KPI strip — Quotations | PFIs | Addresses | Contacts
//   3. Two-panel row:
//        Left  — Tabs (Quotations | PFIs)
//        Right — Details panel (About + Tax + Addresses + Contacts)

import { Fragment, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Edit,
  ArrowLeft,
  Hash,
  File,
  FileText,
  Truck,
  Layers,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { getCustomer, cleanCustomerMessage } from "@src/views/customers/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";

import {
  DetailHeader,
  DetailKpiStrip,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import CustomerDocsTabs from "./CustomerDocsTabs";
import CustomerDetailsPanel from "./CustomerDetailsPanel";

const ViewCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.customer);
  const c = store?.customerItem || {};

  useEffect(() => {
    if (id) dispatch(getCustomer(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCustomerMessage());
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  // KPI counts. The tab panels load each list into its redux slice and
  // the strip mirrors those counts. Invoices module isn't live yet → 0.
  const quotationCount = useSelector(
    (s) => (s.quotation?.quotationItems || []).length
  );
  const pfiCount = useSelector((s) => (s.pfi?.pfiItems || []).length);
  const poCount = useSelector(
    (s) => (s.purchaseOrder?.purchaseOrderItems || []).length
  );
  const invoiceCount = 0;

  const subtitleParts = [c?.primary_contact_name, c?.primary_contact_email]
    .filter(Boolean)
    .join(" · ");

  const kpiItems = [
    {
      key: "invoices",
      label: t("Invoices"),
      value: invoiceCount,
      icon: File,
      tone: "secondary",
    },
    {
      key: "pos",
      label: t("Purchase Orders"),
      value: poCount,
      icon: Truck,
      tone: "secondary",
    },
    {
      key: "quotations",
      label: t("Quotations"),
      value: quotationCount,
      icon: FileText,
      tone: "secondary",
    },
    {
      key: "pfis",
      label: t("PFIs"),
      value: pfiCount,
      icon: Layers,
      tone: "secondary",
    },
  ];

  const headerActions = [
    {
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/customers/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back to Customers"),
      onClick: () => navigate(`${appsRoot}/customers`),
    },
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={c?.company_name || "C"}
          title={c?.company_name || "-"}
          subtitle={subtitleParts || null}
          meta={
            <span className="d-inline-flex align-items-center flex-wrap gap-1">
              {c?._id ? (
                <span>
                  <Hash size={12} className="me-25" />
                  {c._id.slice(-8).toUpperCase()}
                </span>
              ) : null}
              {c?.customer_code ? (
                <span className="ms-1">[{c.customer_code}]</span>
              ) : null}
            </span>
          }
          badge={{
            label: c?.is_active ? t("Active") : t("Inactive"),
            color: c?.is_active ? "success" : "warning",
          }}
          actions={headerActions}
          moreActions={[]}
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={<CustomerDocsTabs />}
          right={<CustomerDetailsPanel />}
        />
      </div>
    </Fragment>
  );
};

export default ViewCustomer;
