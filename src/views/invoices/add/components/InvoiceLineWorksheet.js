// Bridges the invoice add/edit form's plain-`useState` line items to the shared
// react-hook-form–native CostingWorksheet (used by Quotation & Sales Order).
//
// The invoice form owns `lines` in `useState` (read by validators, totals, the
// save payload). The CostingWorksheet needs an RHF form (`useFieldArray` on
// `lines` + header fields `vendor_currency_code`/`freight_total`). So this
// component hosts a SCOPED `useForm`, seeds it from the invoice `lines`, renders
// the worksheet, and mirrors edits back up via `onLinesChange` — with a
// signature guard so our own echo never re-seeds mid-typing. Field names are
// normalised both ways (invoice `packages/net_weight/gross_weight/hsn_code`
// ⇄ worksheet `package_count/net_weight_kg/gross_weight_kg/hs_code`), and the
// invoice-only `uqc_code`/`igst_rate_pct`/`purchase_order_line_id` are preserved.
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import CostingWorksheet from "@src/views/_shared/sales-doc/CostingWorksheet";

const s = (v) => (v == null ? "" : String(v));
const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Invoice line → worksheet line (field-name normalisation; keeps every other
// field, incl. purchase_order_line_id / igst_rate_pct / source_currency_code).
const toWorksheet = (l) => ({
  ...l,
  hsn_code: s(l.hsn_code),
  hs_code: s(l.hsn_code),
  discount_pct: s(l.discount_pct ?? "0"),
  margin_pct: s(l.margin_pct ?? "0"),
  tax_pct: s(l.tax_pct ?? "0"),
  package_count: n(l.packages),
  net_weight_kg: s(l.net_weight ?? "0"),
  gross_weight_kg: s(l.gross_weight ?? "0"),
});

// Worksheet line → invoice line (reverse). `uqcFor` re-derives the GST unit code
// from the (possibly edited) unit; igst/tax stay invoice-shaped.
const toInvoice = (l, uqcFor, i) => ({
  ...l,
  seq: i + 1,
  hsn_code: s(l.hs_code || l.hsn_code),
  packages: n(l.package_count) ? s(l.package_count) : "",
  net_weight: n(l.net_weight_kg) ? s(l.net_weight_kg) : "",
  gross_weight: n(l.gross_weight_kg) ? s(l.gross_weight_kg) : "",
  uqc_code: uqcFor(l.unit || "Nos"),
  igst_rate_pct: s(l.igst_rate_pct ?? "0"),
  // Invoice GST flows through igst_rate_pct; the per-line tax_pct stays 0 (the
  // costing engine excludes GST from line_total, same as the SO/quotation).
  tax_pct: "0",
});

// Stable, format-insensitive signature so an EXTERNAL change (SO picker, import,
// initial seed) is told apart from our own edits echoed back through the parent.
// Numeric fields are coerced so ""/"0"/0 compare equal (round-trip stability).
const sig = (arr) =>
  JSON.stringify(
    (arr || []).map((l) => [
      s(l.product_id),
      n(l.qty),
      n(l.unit_price),
      n(l.discount_pct),
      n(l.margin_pct),
      s(l.hsn_code),
      s(l.part_no),
      s(l.description),
      s(l.unit),
      n(l.packages),
      n(l.net_weight),
      n(l.gross_weight),
      n(l.igst_rate_pct),
      s(l.source_currency_code),
      n(l.cost_exchange_rate),
      s(l.vendor_id),
      s(l.customer_reference),
      JSON.stringify(l.product_expenses_snapshot || []),
      JSON.stringify(l.product_rebates_snapshot || []),
    ])
  );

const InvoiceLineWorksheet = ({
  lines,
  onLinesChange,
  uqcFor,
  productOptions = [],
  expenseOptions = [],
  rebateOptions = [],
  docCurrencyCode = "INR",
  baseCurrencyCode = "INR",
  freightTotal = "0",
  onFreightChange,
  readOnly = false,
  isLut = false,
  // Invoice header exchange_rate (doc-per-₹1) — fed to the worksheet's Excel
  // import/export bar so exported computed columns reconcile in ₹.
  exchangeRate = 1,
}) => {
  // Seed the scoped RHF form once; `vendor_currency_code` defaults to the
  // lines' source currency (else the invoice currency) so the vendor pickers
  // are populated.
  const seedVendorCur = (
    (lines || []).find((l) => l.source_currency_code)?.source_currency_code ||
    docCurrencyCode ||
    "INR"
  ).toUpperCase();

  const form = useForm({
    defaultValues: {
      lines: (lines || []).map(toWorksheet),
      vendor_currency_code: seedVendorCur,
      freight_total: s(freightTotal ?? "0"),
    },
  });
  const { control, setValue, getValues, reset } = form;

  // The last invoice-shaped signature we know the parent holds — so an incoming
  // `lines` prop that equals it is OUR echo (skip re-seed), and one that differs
  // is a genuine external change (re-seed the grid).
  const knownSig = useRef(sig(lines));

  useEffect(() => {
    const incoming = sig(lines);
    if (incoming === knownSig.current) return; // our own edit echoed back
    knownSig.current = incoming;
    reset({
      lines: (lines || []).map(toWorksheet),
      vendor_currency_code:
        getValues("vendor_currency_code") || seedVendorCur,
      freight_total: s(freightTotal ?? getValues("freight_total") ?? "0"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  // Mirror line edits back to the invoice `lines` state as the operator types.
  const watchedLines = useWatch({ control, name: "lines" });
  useEffect(() => {
    if (!watchedLines) return;
    const denorm = watchedLines.map((l, i) => toInvoice(l, uqcFor, i));
    const outSig = sig(denorm);
    if (outSig === knownSig.current) return; // no real change
    knownSig.current = outSig;
    onLinesChange(denorm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedLines]);

  // Mirror the worksheet's Freight total onto the invoice's freight_charges.
  const watchedFreight = useWatch({ control, name: "freight_total" });
  useEffect(() => {
    if (onFreightChange && watchedFreight != null)
      onFreightChange(String(watchedFreight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFreight]);

  return (
    <CostingWorksheet
      control={control}
      setValue={setValue}
      getValues={getValues}
      productOptions={productOptions}
      expenseOptions={expenseOptions}
      rebateOptions={rebateOptions}
      exchangeRate={exchangeRate}
      docCurrencyCode={docCurrencyCode}
      baseCurrencyCode={baseCurrencyCode}
      readOnly={readOnly}
      docType="invoice"
      showIgst
      isLut={isLut}
      allowDuplicateProducts
      hideAddProduct
    />
  );
};

export default InvoiceLineWorksheet;
