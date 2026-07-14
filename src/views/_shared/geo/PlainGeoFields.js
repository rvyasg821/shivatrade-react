// State + City fields for a plain useState form (no react-hook-form).
//
// Same behaviour and same rules as AddressGeoFields — suggestions come from the
// State / City masters over the API, and both stay CreatableSelect so a typed
// value that the master has never heard of is still selectable and still saves.
// The invoice's party snapshots are free-text strings that operators have been
// typing for years; a strict picker would blank them out.
//
// This exists separately only because the invoice wizard holds its state in a
// `form` object rather than react-hook-form, so there is no `control` to bind to.

import { Col, Label } from "reactstrap";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";

import {
  useStateOptions,
  useCityOptions,
  resolveCountryCode,
  toGeoOption,
} from "./useGeoOptions";

/**
 * @param country      whatever the record holds — a name ("India") or ISO code
 * @param countryList  options from useCountryOptions(), used to resolve `country`
 *                     to the ISO-2 the state master filters on
 * @param onChange     called with a patch, e.g. { state: "Gujarat", city: "" }
 */
const PlainGeoFields = ({
  country,
  countryList = [],
  state,
  city,
  onChange,
  colProps = { md: "4" },
}) => {
  const { t } = useTranslation();

  const countryCode = resolveCountryCode(country, countryList);
  const stateOptions = useStateOptions(countryCode);
  const cityOptions = useCityOptions(state, stateOptions);

  return (
    <>
      <Col {...colProps} className="mb-1">
        <Label className="form-label">{t("State")}</Label>
        <CreatableSelect
          classNamePrefix="select"
          isClearable
          options={stateOptions}
          value={toGeoOption(state)}
          // Clear the city with the state: the old city belonged to the old one.
          onChange={(opt) => onChange({ state: opt?.value || "", city: "" })}
          onCreateOption={(input) => onChange({ state: input, city: "" })}
          formatCreateLabel={(input) => `${t("Use")} "${input}"`}
          placeholder={t("Select or type a state")}
          menuPortalTarget={document.body}
          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
        />
      </Col>

      <Col {...colProps} className="mb-1">
        <Label className="form-label">{t("City")}</Label>
        <CreatableSelect
          classNamePrefix="select"
          isClearable
          options={cityOptions}
          value={toGeoOption(city)}
          onChange={(opt) => onChange({ city: opt?.value || "" })}
          onCreateOption={(input) => onChange({ city: input })}
          formatCreateLabel={(input) => `${t("Use")} "${input}"`}
          placeholder={t("Select or type a city")}
          noOptionsMessage={() => t("Type to enter a city")}
          menuPortalTarget={document.body}
          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
        />
      </Col>
    </>
  );
};

export default PlainGeoFields;
