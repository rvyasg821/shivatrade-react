// Side panel for the PO detail page: PDF download + quick fact sheet.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { getVendor } from "@src/views/vendors/store";

const FactRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="py-50 border-bottom">
      <div
        className="text-muted text-uppercase mb-25"
        style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
      >
        {label}
      </div>
      <div
        className="fw-semibold"
        style={{
          color: "#212529",
          wordBreak: "break-word",
          whiteSpace: "pre-line",
        }}
      >
        {value}
      </div>
    </div>
  );
};

const PoActionsPanel = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const { vendorItem } = useSelector((s) => s.vendor || { vendorItem: null });
  const p = purchaseOrderItem || {};
  const [downloading, setDownloading] = useState(false);

  // Pull the vendor record once we know the PO's vendor_id so we can resolve
  // the chosen vendor_address_id (or default address) for display.
  useEffect(() => {
    if (p?.vendor_id && p.vendor_id !== vendorItem?._id) {
      dispatch(getVendor(p.vendor_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.vendor_id]);

  const vendorAddressText = useMemo(() => {
    if (!vendorItem || vendorItem._id !== p?.vendor_id) return null;
    const addrs = vendorItem.addresses || [];
    const a =
      addrs.find((x) => x._id === p?.vendor_address_id) ||
      addrs.find((x) => x.is_default) ||
      addrs[0];
    if (!a) return null;
    return [
      a.address_line1,
      a.address_line2,
      [a.city, a.state, a.postcode].filter(Boolean).join(", "),
      a.country,
    ]
      .filter(Boolean)
      .join("\n");
  }, [vendorItem, p?.vendor_id, p?.vendor_address_id]);

  const onDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${id}/pdf`,
        { responseType: "blob" }
      );
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "purchase-order"}.pdf`;
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Fragment>
      <DetailPanel title={t("PO Summary")}>
        <FactRow label={t("Currency")} value={p?.currency_code} />
        <FactRow label={t("Vendor Address")} value={vendorAddressText} />
        <FactRow label={t("Payment Terms")} value={p?.payment_terms} />
        <FactRow label={t("Delivery Terms")} value={p?.delivery_terms} />
        <FactRow label={t("Delivery Address")} value={p?.delivery_address} />

        <div className="mt-2">
          <Button
            color="primary"
            onClick={onDownloadPdf}
            disabled={downloading}
            block
          >
            <Download size={14} className="me-50" />
            {downloading ? t("Generating…") : t("Download PDF")}
          </Button>
        </div>
      </DetailPanel>
    </Fragment>
  );
};

export default PoActionsPanel;
