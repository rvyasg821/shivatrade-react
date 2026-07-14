// Unit-of-measure options, from the UOM master.
//
// Replaces the hardcoded `PRODUCT_UOM_OPTIONS` + `UOM_INTEGER_ONLY` constants,
// which meant adding a unit needed a code change and a redeploy.
//
// UNLIKE the geo hooks, this one KEEPS a static fallback. An empty country list
// makes an address form annoying; an empty unit list makes the product form
// unsaveable and every line-item grid unusable — `unit_of_measure` is required.
// So if the dropdown ever fails or arrives empty, we fall back to the original
// 14, which are exactly what the backend seeds anyway. The fallback is a
// life-jacket, not a second source of truth: once the API answers, it wins.

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getUomDropdown } from "@src/views/uom/store";
import { PRODUCT_UOM_OPTIONS } from "@constant/options";

/**
 * `[{ value, label, uqc_code, allow_decimal }]` — `value` is the code stored on
 * products and line items ("KG", "Nos").
 */
export const useUomOptions = () => {
  const dispatch = useDispatch();
  const uomDropdown = useSelector((s) => s.uom?.uomDropdown);

  useEffect(() => {
    if (!uomDropdown?.length) dispatch(getUomDropdown());
    // Fetch once per mount; the master rarely changes within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    if (uomDropdown?.length) {
      return uomDropdown.map((u) => ({
        value: u.code,
        label: u.name ? `${u.code} — ${u.name}` : u.code,
        code: u.code,
        uqc_code: u.uqc_code || "",
        allow_decimal: u.allow_decimal !== false,
      }));
    }
    // Master unreachable — keep the forms usable with the seeded 14.
    return PRODUCT_UOM_OPTIONS.map((u) => ({
      value: u.value,
      label: u.label,
      code: u.value,
      uqc_code: "",
      allow_decimal: !u.integer,
    }));
  }, [uomDropdown]);
};

/**
 * The units that reject fractional quantities — the old `UOM_INTEGER_ONLY` set,
 * now decided by the master's `allow_decimal` rather than a frontend constant.
 */
export const useIntegerOnlyUoms = () => {
  const options = useUomOptions();
  return useMemo(
    () => new Set(options.filter((o) => !o.allow_decimal).map((o) => o.value)),
    [options]
  );
};

/**
 * UOM code → GST Unit Quantity Code, for GSTR-1 and the Shipping Bill.
 *
 * This replaces `mapUomToUqc`, which was copy-pasted into three invoice files
 * and only knew 9 of the 14 units — MT, Tonne, Bag, Pallet, Container and CM all
 * fell through to "OTH" on real GST paperwork. The code now comes off the master
 * row, so there is one answer and the client can correct it.
 */
export const useUqcResolver = () => {
  const options = useUomOptions();

  return useMemo(() => {
    const byCode = new Map(
      options.map((o) => [String(o.code).toUpperCase(), o.uqc_code])
    );
    return (unit) => {
      if (!unit) return "";
      // "OTH" is the GST catch-all. Reaching it means the unit is not in the
      // master (a legacy string, or the master was unreachable) — correct, but
      // worth knowing it is a fallback and not a lookup hit.
      return byCode.get(String(unit).trim().toUpperCase()) || "OTH";
    };
  }, [options]);
};
