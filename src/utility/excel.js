// Shared per-document Excel helper — the download-only sibling of pdf.js.
//
// Each document that has a PDF also has a styled single-document Excel (.xlsx)
// that mirrors the PDF layout. Unlike PDFs, Excel is not previewable in-app, so
// there is NO viewer tab: downloadExcel fetches the .xlsx through the authed API
// and saves it straight to disk with the right filename.
//
// To support a new module, add one line to EXCEL_KINDS below — callers then do:
//   downloadExcel({ kind: "quotation", id })
//
// `endpoint(ctx)` returns the authed Excel path; optional `query(ctx)` returns
// query params (e.g. { doc: "commercial", paymentId }); `fallbackName(ctx)` is
// used only when the response carries no Content-Disposition filename. `ctx` is
// { id, ...params }.

import instance from "@src/utility/AxiosConfig";

export const EXCEL_KINDS = {
  quotation: {
    endpoint: ({ id }) => `/admin/quotation/${id}/excel`,
    fallbackName: ({ id }) => `Quotation-${id}.xlsx`,
  },
  // Sales Order (code module: purchase-order)
  purchase_order: {
    endpoint: ({ id }) => `/admin/purchase-order/${id}/excel`,
    fallbackName: ({ id }) => `SalesOrder-${id}.xlsx`,
  },
  // Invoice — one endpoint serves all docs via ?doc= (commercial | export |
  // packing-list | receipt); receipt also needs ?paymentId=.
  invoice: {
    endpoint: ({ id }) => `/admin/invoice/${id}/excel`,
    query: ({ id, ...rest }) => rest, // pass doc + paymentId through
    fallbackName: ({ id, doc }) => `Invoice-${id}${doc ? `-${doc}` : ""}.xlsx`,
  },
  // Vendor PO (POV) document.
  po_vendor: {
    endpoint: ({ id }) => `/admin/po-vendor/${id}/excel`,
    fallbackName: ({ id }) => `VendorPO-${id}.xlsx`,
  },
  // Vendor payment voucher — paymentId is part of the path.
  po_vendor_payment: {
    endpoint: ({ id, paymentId }) =>
      `/admin/po-vendor/${id}/payment-excel/${paymentId}`,
    fallbackName: ({ id }) => `PaymentVoucher-${id}.xlsx`,
  },
  // GRN (Goods Receipt Note)
  grn: {
    endpoint: ({ id }) => `/admin/grn/${id}/excel`,
    fallbackName: ({ id }) => `GRN-${id}.xlsx`,
  },
  // Debit Note
  debit_note: {
    endpoint: ({ id }) => `/admin/debit-note/${id}/excel`,
    fallbackName: ({ id }) => `DebitNote-${id}.xlsx`,
  },
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Mirror the backend's filename sanitiser (voucher → safe file name).
export const buildExcelName = (base) =>
  `${String(base || "document")
    .replace(/[\\/]+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")}.xlsx`;

// Pull the filename out of a Content-Disposition header (same shape as pdf.js).
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

// Fetch the .xlsx through the authed API and save it to disk. Returns the saved
// filename. Call directly from a click handler.
export const downloadExcel = async ({ kind, id, name, ...params }) => {
  const def = EXCEL_KINDS[kind];
  if (!def) throw new Error(`Unknown Excel kind: ${kind}`);
  const ctx = { id, ...params };
  const resp = await instance.get(def.endpoint(ctx), {
    params: def.query ? def.query(ctx) : undefined,
    responseType: "blob",
  });
  const filename =
    (name && buildExcelName(name)) ||
    filenameFromDisposition(resp?.headers?.["content-disposition"]) ||
    (def.fallbackName ? def.fallbackName(ctx) : null) ||
    "document.xlsx";
  const url = window.URL.createObjectURL(
    new Blob([resp.data], { type: XLSX_MIME })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return filename;
};
