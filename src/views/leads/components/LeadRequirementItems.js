// Inline requirement-items grid for the Lead form. One row per requirement:
// Product · HS Code · Part No · Unit · Qty · Customer Ref · Description. No modal
// — add a row and edit in place.
//
// A lead is ONLY a requirement list: no vendor, no pricing, no currency here.
// The vendor + price are resolved later, when the lead is converted to a
// quotation (the costing worksheet auto-fills the cheapest vendor there).
//
// Writes to the same react-hook-form `lines` field array the submit mapping
// reads, so the payload/backend are unchanged — the pricing/vendor fields stay
// defaulted on the line object (from initLineItem); they just aren't entered.

import { Fragment, useState, useEffect } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { Table, Input, Button } from "reactstrap";
import ReactPaginate from "react-paginate";
import { Plus, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import LineItemImportExportBar from "@src/views/_shared/sales-doc/import-export/LineItemImportExportBar";
import Notification from "@components/toast/notification";
import EntitySearchSelect from "@components/entity-select";
import { resolveEntityByIds, ENTITY_KINDS } from "@src/utility/asyncSelect";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const LeadRequirementItems = ({
  control,
  setValue,
  productOptions = [],
  initLineItem,
}) => {
  const { t } = useTranslation();
  const lineFA = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });

  // Resolve product master (code/name) for lines hydrated with only a
  // product_id (edit mode / bulk import) — the picker is a searchable dropdown,
  // so the parent no longer ships the whole catalog and the edit-hydration
  // carries just product_id. Without this the box shows the raw UUID.
  const [fetchedProductsById, setFetchedProductsById] = useState({});
  const productIdsKey = (watchedLines || [])
    .map((l) => l?.product_id || "")
    .join("|");
  useEffect(() => {
    const known = new Set(productOptions.map((o) => String(o.value)));
    const missing = Array.from(
      new Set(
        (watchedLines || [])
          .map((l) => l?.product_id)
          .filter(
            (pid) => pid && !known.has(String(pid)) && !fetchedProductsById[pid]
          )
      )
    );
    if (!missing.length) return;
    resolveEntityByIds(ENTITY_KINDS.product, missing).then((opts) => {
      if (!opts.length) return;
      setFetchedProductsById((m) => {
        const next = { ...m };
        opts.forEach((o) => {
          next[o.value] = o.raw || {};
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, productOptions.length]);

  // Backfill product_code / product_name onto lines that arrived with only a
  // product_id, once resolved — so the Excel export's code columns fill and the
  // label stops depending on the async lookup. Fills only when blank.
  useEffect(() => {
    const byId = new Map(
      productOptions.map((o) => [String(o.value), o.raw || {}])
    );
    Object.entries(fetchedProductsById).forEach(([id, raw]) => {
      if (!byId.has(String(id))) byId.set(String(id), raw);
    });
    if (!byId.size) return;
    (watchedLines || []).forEach((l, idx) => {
      if (!l || !l.product_id) return;
      if (l.product_code || l.product_name) return;
      const raw = byId.get(String(l.product_id));
      if (!raw) return;
      if (raw.code || raw.product_code) {
        setValue(`lines.${idx}.product_code`, raw.code || raw.product_code, {
          shouldDirty: false,
        });
      }
      if (raw.name || raw.product_name) {
        setValue(`lines.${idx}.product_name`, raw.name || raw.product_name, {
          shouldDirty: false,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, productOptions.length, fetchedProductsById]);

  // Label for the product picker's current value. Prefers the line's own
  // code/name; falls back to the ?ids=-resolved master so the box never shows
  // the raw UUID while the backfill catches up.
  const productLabelFor = (l) => {
    let code = l?.product_code;
    let name = l?.product_name;
    if (!code && !name) {
      const raw =
        fetchedProductsById[l?.product_id] ||
        (productOptions.find(
          (o) => String(o.value) === String(l?.product_id)
        )?.raw ||
          {});
      code = raw.code || raw.product_code || "";
      name = raw.name || raw.product_name || "";
    }
    if (code) return `${code} - ${name || ""}`;
    return name || t("Loading…");
  };

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const total = lineFA.fields.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;

  const addRow = () => {
    const newIdx = lineFA.fields.length;
    // Seed product_code / product_name so they're tracked on the row and ride
    // into the Excel export — the shared init line lacks them.
    lineFA.append({
      ...initLineItem,
      product_code: "",
      product_name: "",
    });
    setPage(Math.floor(newIdx / pageSize)); // jump to the page with the new row
  };

  const onPickProduct = (idx, opt) => {
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
              <th style={{ minWidth: 240 }}>{t("Product")}</th>
              <th style={{ minWidth: 130 }}>{t("HS Code")}</th>
              <th style={{ minWidth: 130 }}>{t("Part No")}</th>
              <th style={{ width: 90 }}>{t("Unit")}</th>
              <th className="text-end" style={{ minWidth: 120 }}>
                {t("Qty")}
              </th>
              <th style={{ minWidth: 150 }}>{t("Customer Ref")}</th>
              <th style={{ minWidth: 200 }}>{t("Description")}</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {lineFA.fields.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-3">
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
                                    label: productLabelFor(
                                      watchedLines?.[idx] || {
                                        product_id: field.value,
                                      }
                                    ),
                                  }
                                : null
                            }
                            onChange={(opt) => onPickProduct(idx, opt)}
                            placeholder={t("Search product")}
                          />
                        )}
                      />
                    </td>
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
    </Fragment>
  );
};

export default LeadRequirementItems;
