// Inline requirement-items grid for the Lead form. One row per requirement:
// Product (search-select) · Qty · Unit · Customer Ref · Description. No modal —
// add a row and edit in place (mirrors the product vendor-pricing grid).
//
// Writes to the same react-hook-form `lines` field array the submit mapping
// reads, so the payload/backend are unchanged. Pricing/vendor/tax fields stay
// on the line object (defaulted from initLineItem) and auto-fill later — they
// just aren't entered here, since a lead line is only a requirement.

import { Fragment, useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { Table, Input, Button } from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { Plus, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import LineItemImportExportBar from "@src/views/_shared/sales-doc/import-export/LineItemImportExportBar";
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

  // Amount and Value are in INR (the company's books / vendor price basis).
  // Live values so the per-row "Value" recomputes as the operator types.
  const watchedLines = useWatch({ control, name: "lines" });
  const lineValue = (idx) => {
    const l = watchedLines?.[idx] || {};
    const v = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
    return Number.isFinite(v) ? v : 0;
  };
  const fmtInr = (v) =>
    `₹${(Number(v) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const fmtNum = (v) =>
    (Number(v) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Footer totals: Σ(qty × amount) in INR, then the lead-currency value.
  const inrTotal = (watchedLines || []).reduce(
    (s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0),
    0
  );
  const docRate = Number(rate) || 1;
  const docTotal = inrTotal * docRate;
  const isForeign =
    currencyCode && String(currencyCode).toUpperCase() !== "INR";

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
      const cheapest = [...rows].sort(
        (a, b) => num(a?.unit_price) - num(b?.unit_price)
      )[0];
      if (cheapest) {
        setValue(
          `lines.${idx}.unit_price`,
          cheapest.unit_price != null
            ? Number(cheapest.unit_price).toFixed(2)
            : ""
        );
        setValue(`lines.${idx}.vendor_id`, cheapest.vendor_id || "");
        setValue(`lines.${idx}.vendor_code`, cheapest.vendor_code || "");
        setValue(`lines.${idx}.vendor_name`, cheapest.vendor_name || "");
      } else {
        // No price-list entry — leave the Rate blank for manual entry.
        setValue(`lines.${idx}.unit_price`, "");
      }
    } catch {
      setValue(`lines.${idx}.unit_price`, "");
    }
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-1 mb-1">
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
              <th style={{ width: 110 }}>{t("HS Code")}</th>
              <th style={{ width: 110 }}>{t("Part No")}</th>
              <th style={{ minWidth: 240 }}>{t("Product")}</th>
              <th style={{ width: 90 }}>{t("Unit")}</th>
              <th className="text-end" style={{ width: 110 }}>
                {t("Qty")}
              </th>
              <th className="text-end" style={{ width: 120 }}>
                {t("Rate")} (₹)
              </th>
              <th className="text-end" style={{ width: 130 }}>
                {t("Value")} (₹)
              </th>
              <th style={{ minWidth: 150 }}>{t("Customer Ref")}</th>
              <th style={{ minWidth: 200 }}>{t("Description")}</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {lineFA.fields.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted py-3">
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
                        <Select
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                          options={productOptions}
                          value={
                            productOptions.find(
                              (o) => o.value === field.value
                            ) || null
                          }
                          onChange={(opt) => onPickProduct(idx, opt)}
                          placeholder={t("Select product")}
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
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-end"
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
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
                  <td className="text-end align-middle fw-semibold">
                    {fmtInr(lineValue(idx))}
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
        <div className="d-flex justify-content-end mb-2">
          <Table size="sm" borderless className="w-auto mb-0">
            <tbody>
              <tr>
                <td className="text-muted pe-3 py-25">{t("INR Total")}</td>
                <td className="text-end fw-semibold py-25">
                  {fmtInr(inrTotal)}
                </td>
              </tr>
              {isForeign && (
                <Fragment>
                  <tr>
                    <td className="text-muted pe-3 py-25">
                      {t("Exchange Rate")}
                    </td>
                    <td className="text-end py-25">
                      1 {currencyCode} = ₹{fmtNum(1 / docRate)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3 py-25">
                      {currencyCode} {t("Value")}
                    </td>
                    <td className="text-end fw-bold py-25">
                      {currencySymbol}
                      {fmtNum(docTotal)}
                    </td>
                  </tr>
                </Fragment>
              )}
            </tbody>
          </Table>
        </div>
      )}

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
    </Fragment>
  );
};

export default LeadRequirementItems;
