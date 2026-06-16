// Vendor detail page — composes the shared detail-page kit.
// Layout:
//   1. Header — avatar, company, vendor_code, status badge, edit/back
//   2. KPI strip — Price List | Addresses | Bank Accounts | Categories
//   3. Two-panel row:
//        Left  — Price List tab (with product filter + pagination)
//        Right — Details panel (About + Tax + Categories + Social)

import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Edit,
  ArrowLeft,
  FileText,
  Truck,
  CreditCard,
  Tag,
  User,
  Mail,
  Phone,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { getVendor, cleanVendorMessage } from "@src/views/vendors/store";
import { getPurchaseOrderList } from "@src/views/purchase-orders/store";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";

import {
  DetailHeader,
  DetailKpiStrip,
} from "@src/views/_shared/detail-page";

import VendorTabView from "./tabView";

const ViewVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.vendor);
  const v = store?.vendorItem || {};

  // Lifted so the KPI cards can switch the tab below.
  const [activeTab, setActiveTab] = useState("price_list");

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

  // Primary contact on one line under the company name — icon-prefixed, same
  // style as the vendor listing (name · email · phone).
  const primaryPhone =
    v?.primary_contact_country_code?.formatted ||
    (v?.primary_contact_country_code?.dial_code && v?.primary_contact_phone
      ? `${v.primary_contact_country_code.dial_code} ${v.primary_contact_phone}`
      : v?.primary_contact_phone) ||
    null;

  const contactLine =
    v?.primary_contact_name || v?.primary_contact_email || primaryPhone ? (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {v?.primary_contact_name ? (
          <span className="d-inline-flex align-items-center text-capitalize">
            <User size={13} className="me-25" />
            {v.primary_contact_name}
          </span>
        ) : null}
        {v?.primary_contact_email ? (
          <span className="d-inline-flex align-items-center">
            <Mail size={13} className="me-25" />
            {v.primary_contact_email}
          </span>
        ) : null}
        {primaryPhone ? (
          <span className="d-inline-flex align-items-center">
            <Phone size={13} className="me-25" />
            {primaryPhone}
          </span>
        ) : null}
      </span>
    ) : null;

  const kpiItems = [
    {
      key: "prices",
      label: t("Price List"),
      value: priceCount,
      icon: FileText,
      tone: "secondary",
      onClick: () => setActiveTab("price_list"),
    },
    {
      key: "pos",
      label: t("Purchase Orders"),
      value: poCount,
      icon: Truck,
      tone: "secondary",
      onClick: () => setActiveTab("purchase_orders"),
    },
    {
      key: "banks",
      label: t("Bank Accounts"),
      value: bankCount,
      icon: CreditCard,
      tone: "secondary",
      onClick: () => setActiveTab("bank_accounts"),
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
      onClick: () => navigate(-1),
    },
  ];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText={v?.company_name || "V"}
          title={v?.company_name || "-"}
          subtitle={contactLine}
          meta={
            v?.vendor_code ? (
              <span className="d-inline-flex align-items-center flex-wrap gap-1">
                <span>[{v.vendor_code}]</span>
              </span>
            ) : null
          }
          badge={{
            label: v?.is_active ? t("Active") : t("Inactive"),
            color: v?.is_active ? "success" : "warning",
          }}
          actions={headerActions}
          moreActions={[]}
        />

        <DetailKpiStrip items={kpiItems} />

        <VendorTabView active={activeTab} setActive={setActiveTab} />
      </div>
    </Fragment>
  );
};

export default ViewVendor;
