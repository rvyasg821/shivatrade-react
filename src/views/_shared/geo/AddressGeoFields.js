// State + City fields for ONE address, suggested from the geo masters.
//
// A component rather than inline JSX because each address needs its own
// `useWatch` / `useStateOptions` hooks, and hooks cannot be called inside the
// `.map()` that renders an addresses array.
//
// Works for both field shapes in the app:
//   - array rows   → namePrefix="addresses.0"  → addresses.0.state / .city
//   - flat fields  → namePrefix omitted        → state / city
//
// Values stay plain strings and stay free text (CreatableSelect) — see
// useGeoOptions.js. Anything already saved renders and re-saves as-is.

import { Col, Label } from "reactstrap";
import { Controller, useWatch } from "react-hook-form";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";

import {
  useStateOptions,
  useCityOptions,
  resolveCountryCode,
  toGeoOption,
} from "./useGeoOptions";

/**
 * @param countryField  name of the sibling country field
 * @param countryList   options from useCountryOptions() — used to turn whatever
 *                      the country field holds (ISO code OR full name) into the
 *                      ISO-2 the state master filters on
 * @param namePrefix    "addresses.0" for array rows; omit for flat fields
 */
const AddressGeoFields = ({
  control,
  setValue,
  namePrefix = "",
  countryField,
  countryList = [],
  isReadOnly = false,
  colProps = { md: "6" },
}) => {
  const { t } = useTranslation();

  const stateField = namePrefix ? `${namePrefix}.state` : "state";
  const cityField = namePrefix ? `${namePrefix}.city` : "city";

  const rawCountry = useWatch({ control, name: countryField });
  const stateName = useWatch({ control, name: stateField });

  const countryCode = resolveCountryCode(rawCountry, countryList);
  const stateOptions = useStateOptions(countryCode);
  const cityOptions = useCityOptions(stateName, stateOptions);

  return (
    <>
      <Col {...colProps} className="mb-2">
        <Label className="form-label">{t("State")}</Label>
        <Controller
          name={stateField}
          control={control}
          render={({ field }) => (
            <CreatableSelect
              classNamePrefix="select"
              isDisabled={isReadOnly}
              isClearable
              options={stateOptions}
              value={toGeoOption(field.value)}
              onChange={(option) => {
                field.onChange(option?.value || "");
                // The city belonged to the previous state.
                setValue(cityField, "");
              }}
              onCreateOption={(input) => field.onChange(input)}
              formatCreateLabel={(input) => `${t("Use")} "${input}"`}
              placeholder={t("Select or type a state")}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
            />
          )}
        />
      </Col>

      <Col {...colProps} className="mb-2">
        <Label className="form-label">{t("City")}</Label>
        <Controller
          name={cityField}
          control={control}
          render={({ field }) => (
            <CreatableSelect
              classNamePrefix="select"
              isDisabled={isReadOnly}
              isClearable
              options={cityOptions}
              value={toGeoOption(field.value)}
              onChange={(option) => field.onChange(option?.value || "")}
              onCreateOption={(input) => field.onChange(input)}
              formatCreateLabel={(input) => `${t("Use")} "${input}"`}
              placeholder={t("Select or type a city")}
              noOptionsMessage={() => t("Type to enter a city")}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
            />
          )}
        />
      </Col>
    </>
  );
};

export default AddressGeoFields;
