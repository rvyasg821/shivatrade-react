// Address-form option sources, backed by the Country / State / City masters.
//
// Two rules shape this file, and both exist to keep existing records working:
//
//  1. COUNTRY FALLS BACK TO THE STATIC LIST. The country master is seeded, but
//     if it is ever empty — a fresh database, a failed seed, a 403 — an address
//     form with no countries in it is a broken form. So an empty API response
//     falls back to the `world-countries` list the app has always used. The
//     stored value is the ISO-2 code either way, so the two are interchangeable
//     and no record has to change.
//
//  2. STATE AND CITY STAY FREE TEXT. They are plain strings on the record
//     (`employee.city`, `location.state`), typed by hand for years. The masters
//     SUGGEST values; they do not constrain them. Callers pair these options
//     with a CreatableSelect so a value that is not in the master — every
//     historical row, and the city master ships empty — is still selectable and
//     still saves. Turning these into strict pickers would blank out existing
//     addresses and stop anyone entering a new city.

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCountryDropdown } from "@src/views/countries/store";
import { getStateDropdown } from "@src/views/states/store";
import { getCityDropdown } from "@src/views/cities/store";
import { getCountryList } from "@src/views/auth/register/utils/countryTimezoneUtils";

/**
 * Countries as `{ value: ISO-2 code, label: name }` — the same shape the forms
 * already bind to, so switching the source changes nothing downstream.
 */
export const useCountryOptions = () => {
  const dispatch = useDispatch();
  const countryDropdown = useSelector((s) => s.country?.countryDropdown);

  useEffect(() => {
    if (!countryDropdown?.length) dispatch(getCountryDropdown());
    // Fetch once per mount; the master rarely changes within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    if (countryDropdown?.length) {
      return countryDropdown.map((c) => ({
        value: c.country_code,
        label: c.name,
        _id: c._id,
      }));
    }
    // Master empty or not loaded yet — never leave the form with no countries.
    return getCountryList().map((c) => ({ value: c.value, label: c.label }));
  }, [countryDropdown]);
};

/**
 * States for one country, keyed by ISO-2 code (what address records hold).
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
 * Turn a stored string into a react-select value. A value the master has never
 * heard of still renders — that is the whole point of the creatable pairing.
 */
export const toGeoOption = (value) =>
  value ? { value, label: value } : null;
