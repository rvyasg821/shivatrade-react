// POV Share panel — right column of the POV detail page.
// Initial scope: just a Download PDF button. Mirrors the layout of the
// PFI / PO share panels for visual consistency.

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { DetailPanel } from "@src/views/_shared/detail-page";

const PoVendorShareLinkPanel = () => {
  const { id } = useParams();
  const { t } = useTranslation();

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  const [downloading, setDownloading] = useState(false);
  // Open the dispatch-advice PDF inline in a new tab (proper name) via a
  // short-lived ticket on the no-auth public route — a blob tab is UUID-named.
  const onDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.poVendors.pdf}/${id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.poVendors.ticketPdf
      }?t=${encodeURIComponent(ticket)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
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
    <DetailPanel title={t("Share")}>
      <div className="mb-2">
        <div className="text-muted small mb-1">
          {t("Download a vendor-facing dispatch advice.")}
        </div>
        <Button
          color="primary"
          outline
          onClick={onDownloadPdf}
          disabled={downloading}
          block
        >
          <Download size={14} className="me-50" />
          {downloading ? t("Generating…") : t("Download PDF")}
        </Button>
      </div>
    </DetailPanel>
  );
};

export default PoVendorShareLinkPanel;
