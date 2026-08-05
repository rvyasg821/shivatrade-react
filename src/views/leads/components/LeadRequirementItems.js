// Inline requirement-items grid for the Lead form. One row per requirement:
// Product (search-select) · Qty · Unit · Customer Ref · Description. No modal —
// add a row and edit in place (mirrors the product vendor-pricing grid).
//
// Writes to the same react-hook-form `lines` field array the submit mapping
// reads, so the payload/backend are unchanged. Pricing/vendor/tax fields stay
// on the line object (defaulted from initLineItem) and auto-fill later — they
// just aren't entered here, since a lead line is only a requirement.

import { Fragment, useState, useMemo, useEffect } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { Table, Input, Button, Badge } from "reactstrap";
import ReactPaginate from "react-paginate";
import { Plus, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import { getCurrencySymbol } from "@src/utility/currency";

import LineItemImportExportBar from "@src/views/_shared/sales-doc/import-export/LineItemImportExportBar";
import Notification from "@components/toast/notification";
import EntitySearchSelect from "@components/entity-select";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const LeadRequirementItems = ({
  control,
  setValue,
  productOptions = [],
  initLineItem,
  currencySymbol = "₹",
  currencyCode = "INR",
  rate = 1,
}) => {
  const { t } = useTranslation();
  const lineFA = useFieldArray({ control, name: "lines" });

  // Multi-currency (per-line, mirrors the quotation costing worksheet):
  //   unit_price          = NATIVE vendor price (source currency)
  //   source_currency_code = the vendor/source currency of that price
  //   cost_exchange_rate  = frozen source→lead-currency rate (1 if same)
  //   RATE (lead)  = unit_price × cost_exchange_rate
  //   VALUE (lead) = qty × RATE
  const watchedLines = useWatch({ control, name: "lines" });
  const leadCur = (currencyCode || "INR").toUpperCase();
  const leadSym = getCurrencySymbol(leadCur) || currencySymbol || "₹";

  // Distinct source currencies across lines with a chosen vendor. Each gets one
  // fetched source→lead rate (same currency → fixed 1). Mirrors the worksheet.
  const distinctSources = useMemo(() => {
    const set = new Set();
    for (const l of watchedLines || []) {
      if (!l?.vendor_id) continue;
      set.add((l?.source_currency_code || "INR").toUpperCase());
    }
    return Array.from(set).sort();
  }, [watchedLines]);

  const [sourceRates, setSourceRates] = useState({}); // { CODE: rate }
  const sourcesKey = distinctSources.join("|");
  useEffect(() => {
    let cancelled = false;
    distinctSources.forEach((src) => {
      if (src === leadCur) return;
      if (sourceRates[src] != null) return;
      instance
        .get(API_ENDPOINTS.currencies.currentRate, {
          params: { from: src, to: leadCur },
        })
        .then((resp) => {
          if (cancelled) return;
          const r = Number(resp?.data?.data?.rate);
          setSourceRates((m) => ({ ...m, [src]: r > 0 ? r : 1 }));
        })
        .catch(() => {
          if (!cancelled) setSourceRates((m) => ({ ...m, [src]: 1 }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, leadCur]);

  // Source→lead rate for a line (1 when same currency / no vendor).
  const rateFor = (l) => {
    const sc = (l?.source_currency_code || "INR").toUpperCase();
    if (!l?.vendor_id || sc === leadCur) return 1;
    return Number(sourceRates[sc]) || 1;
  };

  // Freeze each line's cost_exchange_rate onto the form (carried to the quote).
  useEffect(() => {
    (watchedLines || []).forEach((l, idx) => {
      const want = String(rateFor(l));
      if (String(l?.cost_exchange_rate ?? "") !== want) {
        setValue(`lines.${idx}.cost_exchange_rate`, want, {
          shouldDirty: false,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedLines, sourceRates, leadCur]);

  // Per-line converted rate + value, in the lead currency.
  const lineRateDoc = (idx) => {
    const l = watchedLines?.[idx] || {};
    return (Number(l.unit_price) || 0) * rateFor(l);
  };
  const lineValue = (idx) => {
    const l = watchedLines?.[idx] || {};
    return (Number(l.qty) || 0) * lineRateDoc(idx);
  };

  const fmtNum = (v) =>
    (Number(v) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtDoc = (v) => `${leadSym}${fmtNum(v)}`;

  // Footer: single lead-currency total (Σ converted line values). Currencies are
  // never summed raw — every line is converted to the lead currency first.
  const docTotal = (watchedLines || []).reduce(
    (s, _l, i) => s + lineValue(i),
    0
  );

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const total = lineFA.fields.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;

  const addRow = () => {
    const newIdx = lineFA.fields.length;
    // Seed product_code / product_name / vendor_code so they're tracked on the
    // row and ride into the Excel export — the shared init line lacks them, so
    // without this the export's Product/Vendor code columns came out blank.
    lineFA.append({
      ...initLineItem,
      product_code: "",
      product_name: "",
      vendor_code: "",
    });
    setPage(Math.floor(newIdx / pageSize)); // jump to the page with the new row
  };

  const onPickProduct = async (idx, opt) => {
    const raw = opt?.raw || {};

    // No duplicate products on a lead — match by product code. If the picked
    // product already sits on another row, fold this row's qty into that row
    // and drop the duplicate instead of adding a second line.
    const pickedCode = String(raw.code || "").trim().toLowerCase();
    if (opt?.value && pickedCode) {
      const lines = lineFA.fields.map((f, i) => ({
        ...f,
        ...(watchedLines?.[i] || {}),
      }));
      const dupIdx = lines.findIndex(
        (l, i) =>
          i !== idx &&
          String(l?.product_code || "").trim().toLowerCase() === pickedCode
      );
      if (dupIdx !== -1) {
        const mergedQty = num(lines[dupIdx]?.qty) + num(lines[idx]?.qty);
        lineFA.remove(idx);
        const targetIdx = dupIdx > idx ? dupIdx - 1 : dupIdx;
        if (mergedQty > 0) setValue(`lines.${targetIdx}.qty`, mergedQty);
        setPage(Math.floor(targetIdx / pageSize));
        Notification(
          "Validation",
          t(
            "This product is already added. Quantity has been merged into the existing row."
          ),
          "warning"
        );
        return;
      }
    }

    setValue(`lines.${idx}.product_id`, opt ? opt.value : "");
    setValue(`lines.${idx}.product_code`, raw.code || "");
    setValue(`lines.${idx}.product_name`, raw.name || raw.product_name || "");
    // Auto-fill unit from the product's UoM when the row's unit is still blank.
    const uom = raw.unit_of_measure || raw.uom || "";
    if (uom) setValue(`lines.${idx}.unit`, uom);
    // Auto-fill HS Code / Part No from the product (editable afterwards).
    setValue(`lines.${idx}.hs_code`, raw.hsn_code || raw.hs_code || "");
    setValue(`lines.${idx}.part_no`, raw.part_no || "");

    // Auto-fill the Rate (+ vendor) from the cheapest current vendor in the
    // price list for this product.
    if (!opt?.value) {
      setValue(`lines.${idx}.unit_price`, "");
      setValue(`lines.${idx}.source_currency_code`, "INR");
      setValue(`lines.${idx}.cost_exchange_rate`, "1");
      setValue(`lines.${idx}.vendor_id`, "");
      setValue(`lines.${idx}.vendor_code`, "");
      setValue(`lines.${idx}.vendor_name`, "");
      return;
    }
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.priceList.byProduct}/${opt.value}`
      );
      const rows = resp?.data?.data || [];
      // byProduct returns rows sorted cheapest-first BY ₹-equivalent (native ×
      // currency→₹), so a fair cross-currency pick. Fall back to that ordering
      // explicitly (unit_price_inr, unconvertible last) to be safe.
      const cheapest = [...rows].sort((a, b) => {
        const ai = a?.unit_price_inr,
          bi = b?.unit_price_inr;
        if (ai == null && bi == null) return 0;
        if (ai == null) return 1;
        if (bi == null) return -1;
        return num(ai) - num(bi);
      })[0];
      if (cheapest) {
        // Store the NATIVE vendor price + its source currency; RATE/VALUE in the
        // lead currency are derived from these + the fetched pair rate.
        setValue(
          `lines.${idx}.unit_price`,
          cheapest.unit_price != null
            ? Number(cheapest.unit_price).toFixed(2)
            : ""
        );
        setValue(
          `lines.${idx}.source_currency_code`,
          (cheapest.currency_code || "INR").toUpperCase()
        );
        setValue(`lines.${idx}.vendor_id`, cheapest.vendor_id || "");
        setValue(`lines.${idx}.vendor_code`, cheapest.vendor_code || "");
        setValue(`lines.${idx}.vendor_name`, cheapest.vendor_name || "");
      } else {
        // No price-list entry — leave the Rate blank for manual entry.
        setValue(`lines.${idx}.unit_price`, "");
        setValue(`lines.${idx}.source_currency_code`, "INR");
        setValue(`lines.${idx}.cost_exchange_rate`, "1");
      }
    } catch {
      setValue(`lines.${idx}.unit_price`, "");
      setValue(`lines.${idx}.source_currency_code`, "INR");
      setValue(`lines.${idx}.cost_exchange_rate`, "1");
    }
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-1 mb-1 listing-toolbar-actions">
        {/* Bulk entry via Excel — reuses the shared sales-doc import/export
            (backend supports docType "lead"). Shares this component's lineFA so
            imported rows show without a remount. */}
        <LineItemImportExportBar
          docType="lead"
          control={control}
          lineFA={lineFA}
          initLineItem={initLineItem}
          onAfterImport={({ totalAfter }) =>
            setPage(Math.max(0, Math.ceil(totalAfter / pageSize) - 1))
          }
        />
        <Button color="outline-primary" size="sm" onClick={addRow}>
          <Plus size={14} className="me-25" /> {t("Add Row")}
        </Button>
      </div>

      <div className="table-responsive mb-2">
        <Table bordered size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 130 }}>{t("HS Code")}</th>
              <th style={{ minWidth: 130 }}>{t("Part No")}</th>
              <th style={{ minWidth: 240 }}>{t("Product")}</th>
              <th style={{ width: 90 }}>{t("Unit")}</th>
              <th className="text-end" style={{ minWidth: 120 }}>
                {t("Qty")}
              </th>
              <th className="text-end" style={{ minWidth: 130 }}>
                {t("Src Rate")}
              </th>
              <th className="text-center" style={{ width: 80 }}>
                {t("Ccy")}
              </th>
              <th className="text-end" style={{ minWidth: 120 }}>
                {t("Rate")} ({leadSym})
              </th>
              <th className="text-end" style={{ width: 130 }}>
                {t("Value")} ({leadSym})
              </th>
              <th style={{ minWidth: 150 }}>{t("Customer Ref")}</th>
              <th style={{ minWidth: 200 }}>{t("Description")}</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {lineFA.fields.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center text-muted py-3">
                  {t('No requirement items yet — click "Add Row".')}
                </td>
              </tr>
            ) : (
              lineFA.fields.map((row, idx) =>
                idx < pageStart || idx >= pageEnd ? null : (
                <tr key={row.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td>
                    <Controller
                      name={`lines.${idx}.hs_code`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          placeholder={t("HSN")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.part_no`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          placeholder={t("Part No")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.product_id`}
                      control={control}
                      render={({ field }) => (
                        <EntitySearchSelect
                          kind="product"
                          eager={false}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                          isClearable={false}
                          value={
                            field.value
                              ? {
                                  value: field.value,
                                  label: watchedLines?.[idx]?.product_code
                                    ? `${watchedLines[idx].product_code} - ${
                                        watchedLines[idx].product_name || ""
                                      }`
                                    : watchedLines?.[idx]?.product_name ||
                                      field.value,
                                }
                              : null
                          }
                          onChange={(opt) => onPickProduct(idx, opt)}
                          placeholder={t("Search product")}
                        />
                      )}
                    />
                  </td>
                  <td className="align-middle">
                    {watchedLines?.[idx]?.unit ? (
                      watchedLines[idx].unit
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.qty`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Input
                          bsSize="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-end"
                          invalid={!!fieldState.error}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    {/* Native vendor price (source currency), editable. */}
                    <Controller
                      name={`lines.${idx}.unit_price`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-end"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td className="text-center align-middle">
                    {(() => {
                      const sc = (
                        watchedLines?.[idx]?.source_currency_code || "INR"
                      ).toUpperCase();
                      return (
                        <Badge className="doc-badge doc-badge-gray text-nowrap">
                          {sc}
                        </Badge>
                      );
                    })()}
                  </td>
                  <td className="text-end align-middle">
                    {/* Rate converted to the lead currency (native × pair rate). */}
                    {fmtDoc(lineRateDoc(idx))}
                  </td>
                  <td className="text-end align-middle fw-semibold">
                    {fmtDoc(lineValue(idx))}
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.customer_reference`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          placeholder={t("Optional")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.description`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          placeholder={t("Optional")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td className="text-center">
                    <Trash2
                      size={16}
                      className="cursor-pointer text-danger"
                      onClick={() => lineFA.remove(idx)}
                    />
                  </td>
                </tr>
                )
              )
            )}
          </tbody>
        </Table>
      </div>

      {total > 0 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 mb-3 gap-1">
          <div className="d-flex align-items-center small text-muted">
            <span className="me-50">{t("Show")}</span>
            <Input
              type="select"
              bsSize="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(0);
              }}
              style={{ width: 80 }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Input>
            <span className="ms-50">
              {t("of")} {total} {t("rows")}
            </span>
          </div>
          <ReactPaginate
            previousLabel=""
            nextLabel=""
            pageCount={pageCount}
            activeClassName="active"
            forcePage={safePage}
            onPageChange={({ selected }) => setPage(selected)}
            pageClassName="page-item"
            nextLinkClassName="page-link"
            nextClassName="page-item next"
            previousClassName="page-item prev"
            previousLinkClassName="page-link"
            pageLinkClassName="page-link"
            containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
          />
        </div>
      )}

      {total > 0 && (
        <div className="d-flex justify-content-end mb-2">
          <Table size="sm" borderless className="w-auto mb-0">
            <tbody>
              <tr>
                <td className="text-muted pe-3 py-25">
                  {leadCur} {t("Total")}
                </td>
                <td className="text-end fw-bold py-25">{fmtDoc(docTotal)}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      )}
    </Fragment>
  );
};

export default LeadRequirementItems;
