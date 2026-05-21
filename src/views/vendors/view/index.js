// Vendor detail page — composes the shared detail-page kit.
// Layout:
//   1. Header — avatar, company, vendor_code, status badge, edit/back
//   2. KPI strip — Price List | Addresses | Bank Accounts | Categories
//   3. Two-panel row:
//        Left  — Price List tab (with product filter + pagination)
//        Right — Details panel (About + Tax + Categories + Social)

import { Fragment, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Edit, ArrowLeft, Hash, FileText, Truck, CreditCard, Tag } from "react-feather";
import { useTranslation } from "react-i18next";

import { getVendor, cleanVendorMessage } from "@src/views/vendors/store";
import { getPurchaseOrderList } from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";

import {
  DetailHeader,
  DetailKpiStrip,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

import VendorTabView from "./tabView";
import VendorDetailsPanel from "./VendorDetailsPanel";

const ViewVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.vendor);
  const v = store?.vendorItem || {};

  useEffect(() => {
    if (!id) return;
    dispatch(getVendor(id));
    dispatch(
      getPurchaseOrderList({
        orderBy: "po_date",
        orderDirection: "desc",
        page: 1,
        perPage: 1,
        search: "",
        vendor_id: id,
      })
    );
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanVendorMessage());
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  const priceCount = useSelector(
    (s) => s.priceList?.pagination?.total ?? (s.priceList?.priceListItems || []).length
  );
  const poCount = useSelector(
    (s) =>
      s.purchaseOrder?.pagination?.total ??
      (s.purchaseOrder?.purchaseOrderItems || []).length
  );
  const bankCount = (v?.bank_accounts || []).length;
  const categoryCount = (v?.categories || []).length;

  const subtitleParts = [v?.primary_contact_name, v?.primary_contact_email]
    .filter(Boolean)
    .join(" · ");

  const kpiItems = [
    {
      key: "prices",
      label: t("Price List"),
      value: priceCount,
      icon: FileText,
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
      key: "banks",
      label: t("Bank Accounts"),
      value: bankCount,
      icon: CreditCard,
      tone: "secondary",
    },
    {
      key: "categories",
      label: t("Categories"),
      value: categoryCount,
      icon: Tag,
      tone: "secondary",
    },
  ];

  const headerActions = [
    {
      icon: Edit,
      label: t("Edit"),
      onClick: () => navigate(`${appsRoot}/vendors/edit/${id}`),
    },
    {
      icon: ArrowLeft,
      label: t("Back to Vendors"),
      onClick: () => navigate(`${appsRoot}/vendors`),
    },
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={v?.company_name || "V"}
          title={v?.company_name || "-"}
          subtitle={subtitleParts || null}
          meta={
            <span className="d-inline-flex align-items-center flex-wrap gap-1">
              {v?._id ? (
                <span>
                  <Hash size={12} className="me-25" />
                  {v._id.slice(-8).toUpperCase()}
                </span>
              ) : null}
              {v?.vendor_code ? (
                <span className="ms-1">[{v.vendor_code}]</span>
              ) : null}
            </span>
          }
          badge={{
            label: v?.is_active ? t("Active") : t("Inactive"),
            color: v?.is_active ? "success" : "warning",
          }}
          actions={headerActions}
          moreActions={[]}
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={<VendorTabView />}
          right={<VendorDetailsPanel />}
        />
      </div>
    </Fragment>
  );
};

export default ViewVendor;
