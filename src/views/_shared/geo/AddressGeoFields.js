// City + State fields for ONE address row, suggested from the geo masters.
//
// A component rather than inline JSX because each row needs its own
// `useWatch`/`useStateOptions` hooks, and hooks cannot be called inside the
// `.map()` that renders the rows.
//
// Values stay plain strings and stay free text (CreatableSelect) — see
// useGeoOptions.js for why. Anything already saved renders and re-saves as-is.

import { Col, Label } from "reactstrap";
import { Controller, useWatch } from "react-hook-form";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";

import { useStateOptions, useCityOptions, toGeoOption } from "./useGeoOptions";

/**
 * @param countryField  name of the sibling country field on this row
 * @param countryAsName true when the row stores the country NAME ("India")
 *                      rather than the ISO code — company addresses do.
 * @param countryList   options from useCountryOptions(), used to turn that name
 *                      back into the ISO code the state master filters on.
 */
const AddressGeoFields = ({
  control,
  setValue,
  namePrefix,
  countryField,
  countryList = [],
  countryAsName = false,
  isReadOnly = false,
  colProps = { md: "6" },
}) => {
  const { t } = useTranslation();

  const rawCountry = useWatch({ control, name: countryField });
  const stateName = useWatch({ control, name: `${namePrefix}.state` });

  const countryCode = (() => {
    if (!rawCountry) return "";
    if (!countryAsName) return rawCountry;
    const match = countryList.find(
      (c) =>
        c.label?.toLowerCase() === String(rawCountry).toLowerCase() ||
        c.value?.toLowerCase() === String(rawCountry).toLowerCase()
    );
    return match?.value || "";
  })();

  const stateOptions = useStateOptions(countryCode);
  const cityOptions = useCityOptions(stateName, stateOptions);

  return (
    <>
      <Col {...colProps} className="mb-2">
        <Label className="form-label">{t("State")}</Label>
        <Controller
          name={`${namePrefix}.state`}
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
                setValue(`${namePrefix}.city`, "");
              }}
              onCreateOption={(input) => field.onChange(input)}
              formatCreateLabel={(input) => `${t("Use")} "${input}"`}
              placeholder={t("Select or type a state")}
            />
          )}
        />
      </Col>

      <Col {...colProps} className="mb-2">
        <Label className="form-label">{t("City")}</Label>
        <Controller
          name={`${namePrefix}.city`}
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
            />
          )}
        />
      </Col>
    </>
  );
};

export default AddressGeoFields;
