// Shared PDF helper for the in-app PDF viewer.
//
// Why an in-app viewer (vs. opening a backend public URL or a bare blob tab):
//   • the tab stays on the FRONTEND origin (the backend host / ticket is never
//     exposed in the URL bar),
//   • the PDF is fetched once through the authenticated API (no separate ticket
//     round-trip) and shown from memory, so it feels instant,
//   • the viewer page offers a Download button that saves the file with the
//     CORRECT name — a bare blob tab's built-in Save can only use the blob's
//     random id, which the page cannot override.
//
// To support a new module, add one line to PDF_KINDS below — every caller then
// just does:  openPdfViewer({ kind: "quotation", id })
//
// `endpoint(ctx)` returns the authed PDF path; optional `query(ctx)` returns
// query params (e.g. { doc: "commercial" }); `fallbackName(ctx)` is used only
// when the response carries no Content-Disposition filename. `ctx` is
// { id, ...params }.

import instance from "@src/utility/AxiosConfig";
import { appsRoot } from "@constant/defaultValues";

export const PDF_KINDS = {
  quotation: {
    endpoint: ({ id }) => `/admin/quotation/${id}/pdf`,
    fallbackName: ({ id }) => `Quotation-${id}.pdf`,
  },
  // Sales Order (code module: purchase-order)
  purchase_order: {
    endpoint: ({ id }) => `/admin/purchase-order/${id}/pdf`,
    fallbackName: ({ id }) => `SalesOrder-${id}.pdf`,
  },
  // Invoice — one endpoint serves all docs via ?doc= (commercial | export |
  // packing-list | receipt); receipt also needs ?paymentId=.
  invoice: {
    endpoint: ({ id }) => `/admin/invoice/${id}/pdf`,
    query: ({ id, ...rest }) => rest, // pass doc + paymentId through
    fallbackName: ({ id, doc }) => `Invoice-${id}${doc ? `-${doc}` : ""}.pdf`,
  },
  // Vendor PO (POV) document.
  po_vendor: {
    endpoint: ({ id }) => `/admin/po-vendor/${id}/pdf`,
    fallbackName: ({ id }) => `VendorPO-${id}.pdf`,
  },
  // Vendor payment voucher — paymentId is part of the path.
  po_vendor_payment: {
    endpoint: ({ id, paymentId }) =>
      `/admin/po-vendor/${id}/payment-pdf/${paymentId}`,
    fallbackName: ({ id }) => `PaymentVoucher-${id}.pdf`,
  },
  // GRN (Goods Receipt Note)
  grn: {
    endpoint: ({ id }) => `/admin/grn/${id}/pdf`,
    fallbackName: ({ id }) => `GRN-${id}.pdf`,
  },
  // Debit Note
  debit_note: {
    endpoint: ({ id }) => `/admin/debit-note/${id}/pdf`,
    fallbackName: ({ id }) => `DebitNote-${id}.pdf`,
  },
  // RFQ — optional ?vendor_id= filters to one vendor's request.
  rfq: {
    endpoint: ({ id }) => `/admin/rfq/${id}/pdf`,
    query: ({ id, ...rest }) => rest, // pass vendor_id through
    fallbackName: ({ id }) => `RFQ-${id}.pdf`,
  },
};

const PDF_VIEWER_PATH = `${appsRoot}/pdf-viewer`;

// Mirror the backend's filename sanitisation (voucher → safe file name): turn
// slashes into underscores, drop other punctuation, append .pdf. Passing the
// name from the caller is needed because the API is a different origin, so the
// browser hides the response's Content-Disposition from JS.
export const buildPdfName = (base) =>
  `${String(base || "document")
    .replace(/[\\/]+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")}.pdf`;

// Pull the filename out of a Content-Disposition header
// (`inline; filename="Quotation-QT0001.pdf"` or RFC 5987 `filename*=UTF-8''…`).
const filenameFromDisposition = (cd) => {
  if (!cd) return null;
  const star = /filename\*=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = /filename=["']?([^"';]+)["']?/i.exec(cd);
  return plain?.[1] || null;
};

// Open the in-app viewer in a new tab. Called directly from a click handler so
// the tab is allowed (not popup-blocked). Pass `name` (e.g. the voucher no) so
// the viewer shows + saves the correct filename.
export const openPdfViewer = ({ kind, id, name, params = {} }) => {
  const query = { kind, id: String(id), ...params };
  if (name) query.name = buildPdfName(name);
  const qs = new URLSearchParams(query).toString();
  window.open(`${PDF_VIEWER_PATH}?${qs}`, "_blank");
};

// Used by the viewer page: fetch the PDF as a blob and resolve its filename.
export const fetchPdfBlob = async ({ kind, id, params = {} }) => {
  const def = PDF_KINDS[kind];
  if (!def) throw new Error(`Unknown PDF kind: ${kind}`);
  const ctx = { id, ...params };
  const resp = await instance.get(def.endpoint(ctx), {
    params: def.query ? def.query(ctx) : undefined,
    responseType: "blob",
  });
  const blob = new Blob([resp.data], { type: "application/pdf" });
  const name =
    filenameFromDisposition(resp?.headers?.["content-disposition"]) ||
    (def.fallbackName ? def.fallbackName(ctx) : null) ||
    "document.pdf";
  return { blob, name };
};
