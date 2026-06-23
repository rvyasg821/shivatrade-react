// POV Share panel — right column of the POV detail page.
// Initial scope: just a Download PDF button. Mirrors the layout of the
// PFI / PO share panels for visual consistency.

import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import { openPdfViewer } from "@src/utility/pdf";
import { DetailPanel } from "@src/views/_shared/detail-page";

const PoVendorShareLinkPanel = () => {
  const { id } = useParams();
  const { t } = useTranslation();

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  // Open the Vendor PO PDF in the in-app viewer (new tab, frontend origin) —
  // fetched via the authed API, shown there, with a correctly-named Download.
  const onDownloadPdf = () =>
    openPdfViewer({ kind: "po_vendor", id, name: p?.voucher_no });

  return (
    <DetailPanel title={t("Share")}>
      <div className="mb-2">
        <div className="text-muted small mb-1">
          {t("Download a vendor-facing dispatch advice.")}
        </div>
        <Button color="primary" outline onClick={onDownloadPdf} block>
          <Download size={14} className="me-50" />
          {t("Download PDF")}
        </Button>
      </div>
    </DetailPanel>
  );
};

export default PoVendorShareLinkPanel;
