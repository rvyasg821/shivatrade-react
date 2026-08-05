// Shared "add missing rows to the vendor price list on save" flow, used by the
// Costing Worksheet (Quotation/SO) and the standalone Vendor-PO create form.
//
// Given the doc's priced lines, it finds every (vendor, product) pair that is
// NOT yet in the price list, confirms with ONE SweetAlert (with a count), then
// creates each entry using the rate already entered on the row (unit_price) and
// today's effective date — no price/date prompt. Returns true to let the save
// proceed, false if the user cancels.

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const mySwal = withReactContent(Swal);

const todayIso = () => new Date().toISOString().slice(0, 10);

const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

const money = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * @param {Object}   args
 * @param {Array}    args.lines  [{ product_id, product_name, vendor_id, vendor_name, unit_price }]
 * @param {Function} args.t      i18n translate
 * @param {string}   [args.currencySymbol]  shown next to the rate in the dialog
 * @returns {Promise<boolean>}   true = continue the save, false = user cancelled
 */
export async function confirmAndCreateMissingPrices({
  lines,
  t,
  currencySymbol = "",
  // silent=true skips the confirm dialog and just creates the missing entries
  // (used at import-confirm, where the import review already listed them). A
  // toast reports the result instead.
  silent = false,
}) {
  const tr = typeof t === "function" ? t : (s) => s;

  // Only rows that actually carry a vendor + product + a positive rate can be
  // added to the price list.
  const priced = (lines || []).filter(
    (l) =>
      l &&
      l.product_id &&
      l.vendor_id &&
      Number(l.unit_price) > 0,
  );
  if (!priced.length) return true;

  // Which (vendor, product) pairs already exist? One by-product lookup each.
  const productIds = Array.from(new Set(priced.map((l) => l.product_id)));
  const existing = new Set(); // `${vendor_id}|${product_id}`
  await Promise.all(
    productIds.map((pid) =>
      instance
        .get(`${API_ENDPOINTS.priceList.byProduct}/${pid}`)
        .then((r) => {
          (r?.data?.data || []).forEach((row) => {
            if (row.vendor_id) existing.add(`${row.vendor_id}|${pid}`);
          });
        })
        .catch(() => {}),
    ),
  );

  // Missing pairs, de-duped (first rate wins if a pair repeats across rows).
  const seen = new Set();
  const toAdd = [];
  for (const l of priced) {
    const key = `${l.vendor_id}|${l.product_id}`;
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    toAdd.push(l);
  }
  if (!toAdd.length) return true; // nothing missing → save straight through

  // Lead with the count, then preview only the first few so a big doc (or a
  // Interactive (manual save) → confirm first. Silent (import) → just do it,
  // the import review already listed these rows.
  if (!silent) {
    // Lead with the count, then preview only the first few so a big doc (or a
    // bulk import) never renders dozens/hundreds of rows.
    const PREVIEW = 8;
    const listHtml =
      toAdd
        .slice(0, PREVIEW)
        .map(
          (l) =>
            `<li><b>${escapeHtml(
              l.product_name || l.product_id,
            )}</b> — ${escapeHtml(l.vendor_name || "")} → ${escapeHtml(
              currencySymbol,
            )}${money(l.unit_price)}</li>`,
        )
        .join("") +
      (toAdd.length > PREVIEW
        ? `<li class="text-muted">…${tr("and")} ${
            toAdd.length - PREVIEW
          } ${tr("more")}</li>`
        : "");

    const res = await mySwal.fire({
      title: tr("Update price list?"),
      // Count is inlined as a literal (NOT an i18next {{n}} placeholder, which
      // gets stripped before a .replace() could run).
      html: `<p class="mb-1"><b>${toAdd.length}</b> ${tr(
        "product(s) will be added to the vendor's price list at the entered rate (effective today):",
      )}</p><ul style="text-align:left;max-height:200px;overflow:auto">${listHtml}</ul>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: tr("Update price list & save"),
      cancelButtonText: tr("Cancel"),
      buttonsStyling: false,
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-secondary ms-1",
      },
    });
    if (!res.isConfirmed) return false;
  }

  const results = await Promise.allSettled(
    toAdd.map((l) =>
      instance.post(API_ENDPOINTS.priceList.create, {
        vendor_id: l.vendor_id,
        product_id: l.product_id,
        // Currency is inferred from the vendor by the backend.
        unit_price: String(l.unit_price),
        effective_date: todayIso(),
      }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  const added = toAdd.length - failed;

  if (silent) {
    // Import path → a toast (no dialog).
    if (added > 0) {
      Notification(
        tr("Price list updated"),
        `${added} ${tr("price(s) added to the price list.")}`,
        "success",
      );
    }
    if (failed) {
      Notification(
        tr("Warning"),
        `${failed} ${tr("price(s) could not be added — fix them in the Price List.")}`,
        "warning",
      );
    }
  } else if (failed) {
    await mySwal.fire({
      title: tr("Some prices weren't added"),
      text: `${failed} ${tr("of")} ${toAdd.length} ${tr(
        "price entries could not be added. You can still continue and fix them in the Price List.",
      )}`,
      icon: "warning",
      confirmButtonText: tr("Continue"),
      buttonsStyling: false,
      customClass: { confirmButton: "btn btn-primary" },
    });
  }
  return true;
}
