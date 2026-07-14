// Address-form option sources, backed by the Country / State / City masters.
//
// DATABASE ONLY. There is no static country/state/city package behind any of
// these — every option comes from /admin/{country,state,city}/dropdown. If the
// API returns nothing, the list is empty; it does not silently fall back to a
// bundled list, because then the master screens would stop being the single
// source of truth and nobody could tell which list they were looking at.
//
// STATE AND CITY STAY FREE TEXT. They are plain strings on the record
// (`customer.addresses[].city`, `lead.state`), typed by hand for years. The
// masters SUGGEST values; they do not constrain them. Callers pair these
// options with a CreatableSelect so a value that is not in the master — every
// historical row — is still selectable and still saves. Turning these into
// strict pickers would blank out existing addresses.

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCountryDropdown } from "@src/views/countries/store";
import { getStateDropdown } from "@src/views/states/store";
import { getCityDropdown } from "@src/views/cities/store";

/**
 * Countries from the master.
 *
 * @param valueBy  what the FORM stores in its country field:
 *                 "code" → ISO-2 ("IN") — Locations, Employee address
 *                 "name" → full name ("India") — Lead, Customer, Company
 *
 * Every option also carries `code`, so a name-valued form can still resolve its
 * country back to the ISO-2 the state dropdown filters on.
 */
export const useCountryOptions = (valueBy = "code") => {
  const dispatch = useDispatch();
  const countryDropdown = useSelector((s) => s.country?.countryDropdown);

  useEffect(() => {
    if (!countryDropdown?.length) dispatch(getCountryDropdown());
    // Fetch once per mount; the master rarely changes within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () =>
      (countryDropdown || []).map((c) => ({
        value: valueBy === "name" ? c.name : c.country_code,
        label: c.name,
        code: c.country_code,
        _id: c._id,
      })),
    [countryDropdown, valueBy]
  );
};

/**
 * States for one country, keyed by ISO-2 code.
 *
 * Options are `{ value: name, label: name }`: the record stores the NAME, so
 * the master has to hand back something a legacy free-text row can match.
 */
export const useStateOptions = (countryCode) => {
  const dispatch = useDispatch();
  const stateDropdown = useSelector((s) => s.states?.stateDropdown);

  useEffect(() => {
    dispatch(
      getStateDropdown(countryCode ? { country_code: countryCode } : {})
    );
  }, [countryCode, dispatch]);

  return useMemo(
    () =>
      (stateDropdown || []).map((s) => ({
        value: s.name,
        label: s.name,
        _id: s._id,
      })),
    [stateDropdown]
  );
};

/**
 * Cities under a state, found by the state's NAME (again: that is what the
 * record stores). Returns [] until a state is chosen — asking for every city in
 * the master is not a useful suggestion list.
 */
export const useCityOptions = (stateName, stateOptions) => {
  const dispatch = useDispatch();
  const cityDropdown = useSelector((s) => s.city?.cityDropdown);

  const stateId = useMemo(() => {
    if (!stateName) return null;
    const match = (stateOptions || []).find(
      (o) => String(o.value).toLowerCase() === String(stateName).toLowerCase()
    );
    return match?._id || null;
  }, [stateName, stateOptions]);

  useEffect(() => {
    if (stateId) dispatch(getCityDropdown({ state_id: stateId }));
  }, [stateId, dispatch]);

  return useMemo(() => {
    // The state was typed by hand and matches nothing in the master — there is
    // nothing to suggest, and the CreatableSelect still accepts free text.
    if (!stateId) return [];
    return (cityDropdown || []).map((c) => ({ value: c.name, label: c.name }));
  }, [cityDropdown, stateId]);
};

/**
 * Resolve whatever a form stores in its country field — an ISO-2 code, a full
 * name, or a stale free-text value — to the ISO-2 the state master filters on.
 */
export const resolveCountryCode = (rawCountry, countryOptions = []) => {
  if (!rawCountry) return "";
  const needle = String(rawCountry).toLowerCase();
  const match = countryOptions.find(
    (c) =>
      String(c.value).toLowerCase() === needle ||
      String(c.label).toLowerCase() === needle ||
      String(c.code).toLowerCase() === needle
  );
  // `code` is what the API options carry. Falling back to `value` keeps this
  // working for any option list that is already ISO-code-valued.
  return match?.code || match?.value || "";
};

/**
 * Turn a stored string into a react-select value. A value the master has never
 * heard of still renders — that is the whole point of the creatable pairing.
 */
export const toGeoOption = (value) => (value ? { value, label: value } : null);
