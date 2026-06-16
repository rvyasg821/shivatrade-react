// Inline requirement-items grid for the Lead form. One row per requirement:
// Product (search-select) · Qty · Unit · Customer Ref · Description. No modal —
// add a row and edit in place (mirrors the product vendor-pricing grid).
//
// Writes to the same react-hook-form `lines` field array the submit mapping
// reads, so the payload/backend are unchanged. Pricing/vendor/tax fields stay
// on the line object (defaulted from initLineItem) and auto-fill later — they
// just aren't entered here, since a lead line is only a requirement.

import { Fragment } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { Table, Input, Button } from "reactstrap";
import Select from "react-select";
import { Plus, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

const LeadRequirementItems = ({
  control,
  setValue,
  productOptions = [],
  initLineItem,
}) => {
  const { t } = useTranslation();
  const lineFA = useFieldArray({ control, name: "lines" });

  const addRow = () => lineFA.append({ ...initLineItem });

  const onPickProduct = (idx, opt) => {
    const raw = opt?.raw || {};
    setValue(`lines.${idx}.product_id`, opt ? opt.value : "");
    setValue(`lines.${idx}.product_code`, raw.code || "");
    setValue(`lines.${idx}.product_name`, raw.name || raw.product_name || "");
    // Auto-fill unit from the product's UoM when the row's unit is still blank.
    const uom = raw.unit_of_measure || raw.uom || "";
    if (uom) setValue(`lines.${idx}.unit`, uom);
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-1 mb-1">
        <Button color="outline-primary" size="sm" onClick={addRow}>
          <Plus size={14} className="me-25" /> {t("Add Row")}
        </Button>
      </div>

      <div className="table-responsive">
        <Table bordered size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 240 }}>{t("Product")}</th>
              <th className="text-end" style={{ width: 110 }}>
                {t("Qty")}
              </th>
              <th style={{ width: 110 }}>{t("Unit")}</th>
              <th style={{ minWidth: 150 }}>{t("Customer Ref")}</th>
              <th style={{ minWidth: 200 }}>{t("Description")}</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {lineFA.fields.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-3">
                  {t('No requirement items yet — click "Add Row".')}
                </td>
              </tr>
            ) : (
              lineFA.fields.map((row, idx) => (
                <tr key={row.id}>
                  <td className="text-muted">{idx + 1}</td>
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
                  <td>
                    <Controller
                      name={`lines.${idx}.qty`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          type="number"
                          min="0"
                          className="text-end"
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.unit`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          placeholder={t("e.g. PCS")}
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
              ))
            )}
          </tbody>
        </Table>
      </div>
    </Fragment>
  );
};

export default LeadRequirementItems;
