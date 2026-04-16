import { Fragment, useEffect, useState } from "react";
import { Row, Col, Label, Input, Button, FormFeedback, Spinner, InputGroup, InputGroupText } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import DateInput from "@components/date-input";
import { getLocationList } from "@src/views/locations/store";
import { getLookups, createLookup } from "@src/views/company-lookups/store";
import { getCodeSettings } from "@src/views/company-settings/store";
import { getLocationAssignments, addLocationAssignment, removeLocationAssignment } from "../../store";
import Notification from "@components/toast/notification";


import useFormLoading from "@src/hooks/useFormLoading";

const JobDetailsTab = ({ employeeData, employeeId, onSave, loading }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const dispatch = useDispatch();
  const locationStore = useSelector((state) => state.location);
  const lookupStore = useSelector((state) => state.companyLookup);
  const locationAssignments = useSelector((state) => state.employee?.locationAssignments) || [];
  const authStore = useSelector((state) => state.auth);
  const selectedLocationId = useSelector((state) => state.locationContext?.selectedLocationId);
  const isLocationAdmin = authStore?.authUserItem?.role?.name === "Location Admin";

  const [locationOptions, setLocationOptions] = useState([]);
  const [newAssignmentLocation, setNewAssignmentLocation] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Employee code settings
  const codeSettingsStore = useSelector((state) => state.companySettings?.codeSettings);
  const [employeeCodePrefix, setEmployeeCodePrefix] = useState('');
  const [employeeCodeAuto, setEmployeeCodeAuto] = useState(false);

  const schema = yup.object().shape({
    employee_code: yup.string().required(t("Employee Code is required")),
    designation: yup.string().required(t("Designation is required")),
    department: yup.string().required(t("Department is required")),
    date_of_joining: yup.string().required(t("Date of Joining is required")).transform((v) => (v === "" ? null : v)).nullable(),
    location_id: yup.mixed().required(t("Location is required")),
  });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    mode: "all",
    shouldFocusError: false,
    resolver: yupResolver(schema),
    defaultValues: {
      employee_code: "",
      designation: "",
      department: "",
      employment_type: "",
      date_of_joining: "",
      location_id: "",
      reporting_to: "",
      is_active: true,
    },
  });

  useEffect(() => {
    dispatch(getLocationList({ status: "ACTIVE", dropdown: "yes" }));
    dispatch(getLookups("designation"));
    dispatch(getLookups("department"));
    dispatch(getCodeSettings());
    if (employeeId) dispatch(getLocationAssignments(employeeId));
  }, []);

  // Update code prefix/auto from settings
  useEffect(() => {
    if (codeSettingsStore) {
      const isAuto = codeSettingsStore.employee_code_mode === 'auto';
      const prefix = codeSettingsStore.employee_code_prefix || '';
      setEmployeeCodeAuto(isAuto);
      setEmployeeCodePrefix(prefix);
    }
  }, [codeSettingsStore]);

  useEffect(() => {
    if (locationStore?.locationItems) {
      const options = locationStore.locationItems.map((loc) => ({
        ...loc,
        value: loc._id,
        label: loc.location_name,
      }));
      setLocationOptions(options);
    }
  }, [locationStore?.locationItems]);

  useEffect(() => {
    if (employeeData && locationOptions.length > 0) {
      const locId = employeeData.location_id?._id || employeeData.location_id;
      const locOption = locationOptions.find((o) => o.value === locId) || null;

      // Strip prefix from employee_code for display
      let displayCode = employeeData.employee_code || "";
      if (employeeCodePrefix && displayCode.toUpperCase().startsWith(employeeCodePrefix.toUpperCase())) {
        displayCode = displayCode.slice(employeeCodePrefix.length);
      }

      reset({
        employee_code: displayCode,
        designation: employeeData.designation || "",
        department: employeeData.department || "",
        employment_type: employeeData.employment_type || "",
        date_of_joining: employeeData.date_of_joining || "",
        location_id: locOption || "",
        reporting_to: employeeData.reporting_to || "",
        is_active: employeeData.is_active !== false,
      });
    }
  }, [employeeData, locationOptions, employeeCodePrefix]);

  const handleAddAssignment = async () => {
    if (!newAssignmentLocation) return;
    setAssignmentLoading(true);
    try {
      await dispatch(addLocationAssignment({ employeeId, data: { location_id: newAssignmentLocation.value } })).unwrap();
      setNewAssignmentLocation(null);
      dispatch(getLocationAssignments(employeeId));
      Notification("Success", t("Location assigned"), "success");
    } catch (error) {
      Notification("Error", error || t("Failed"), "warning");
    }
    setAssignmentLoading(false);
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await dispatch(removeLocationAssignment(assignmentId)).unwrap();
      Notification("Success", t("Location removed"), "success");
    } catch (error) {
      Notification("Error", error || t("Failed"), "warning");
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await onSave({
        employee_code: (() => {
          const raw = (values.employee_code || "").toUpperCase();
          const pfx = employeeCodePrefix.toUpperCase();
          if (pfx && raw.startsWith(pfx)) return raw;
          return `${employeeCodePrefix}${raw}`;
        })(),
        designation: values.designation || "",
        department: values.department || "",
        employment_type: values.employment_type || "",
        date_of_joining: values.date_of_joining || null,
        location_id: isLocationAdmin && selectedLocationId
          ? selectedLocationId
          : (values.location_id?.value || values.location_id || ""),
        reporting_to: values.reporting_to || null,
        is_active: values.is_active,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Employee Code")} <span className="text-danger">*</span></Label>
            <Controller name="employee_code" control={control} render={({ field }) => (
              employeeCodePrefix ? (
                <InputGroup>
                  <InputGroupText>{employeeCodePrefix}</InputGroupText>
                  <Input {...field} style={{ textTransform: "uppercase" }} invalid={!!errors.employee_code}
                    readOnly={employeeCodeAuto}
                    onChange={(e) => !employeeCodeAuto && field.onChange(e.target.value.toUpperCase())} />
                </InputGroup>
              ) : (
                <Input {...field} style={{ textTransform: "uppercase" }} invalid={!!errors.employee_code}
                  readOnly={employeeCodeAuto}
                  onChange={(e) => !employeeCodeAuto && field.onChange(e.target.value.toUpperCase())} />
              )
            )} />
            <FormFeedback>{errors.employee_code?.message}</FormFeedback>
            {employeeCodeAuto && <small className="text-muted">{t("Auto-generated code (read-only)")}</small>}
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Location")} <span className="text-danger">*</span></Label>
            <Controller name="location_id" control={control} render={({ field }) => (
              <Select
                {...field}
                isClearable={false}
                options={locationOptions}
                className="react-select"
                classNamePrefix="select"
                placeholder={t("Select location...")}
                isDisabled={isLocationAdmin}
              />
            )} />
            <FormFeedback className="d-block">{errors.location_id?.message}</FormFeedback>
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Designation")} <span className="text-danger">*</span></Label>
            <Controller name="designation" control={control} render={({ field }) => (
              <CreatableSelect
                isClearable
                className="react-select"
                classNamePrefix="select"
                placeholder={t("Select or type...")}
                options={(lookupStore?.designations || []).map((d) => ({ value: d.name, label: d.name }))}
                value={field.value ? { value: field.value, label: field.value } : null}
                onChange={(opt) => field.onChange(opt?.value || "")}
                onCreateOption={(inputValue) => {
                  dispatch(createLookup({ type: "designation", name: inputValue })).unwrap().then(() => field.onChange(inputValue)).catch(() => {});
                }}
                formatCreateLabel={(v) => `${t("Create")} "${v}"`}
                styles={errors.designation ? { control: (base) => ({ ...base, borderColor: "#ea5455" }) } : {}}
              />
            )} />
            <FormFeedback className="d-block">{errors.designation?.message}</FormFeedback>
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Department")} <span className="text-danger">*</span></Label>
            <Controller name="department" control={control} render={({ field }) => (
              <CreatableSelect
                isClearable
                className="react-select"
                classNamePrefix="select"
                placeholder={t("Select or type...")}
                options={(lookupStore?.departments || []).map((d) => ({ value: d.name, label: d.name }))}
                value={field.value ? { value: field.value, label: field.value } : null}
                onChange={(opt) => field.onChange(opt?.value || "")}
                onCreateOption={(inputValue) => {
                  dispatch(createLookup({ type: "department", name: inputValue })).unwrap().then(() => field.onChange(inputValue)).catch(() => {});
                }}
                formatCreateLabel={(v) => `${t("Create")} "${v}"`}
                styles={errors.department ? { control: (base) => ({ ...base, borderColor: "#ea5455" }) } : {}}
              />
            )} />
            <FormFeedback className="d-block">{errors.department?.message}</FormFeedback>
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Employment Type")}</Label>
            <Controller name="employment_type" control={control} render={({ field }) => (
              <Input type="select" {...field}>
                <option value="">{t("Select Type")}</option>
                <option value="full-time">{t("Full Time")}</option>
                <option value="part-time">{t("Part Time")}</option>
                <option value="contract">{t("Contract")}</option>
                <option value="intern">{t("Intern")}</option>
              </Input>
            )} />
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Date of Joining")} <span className="text-danger">*</span></Label>
            <Controller name="date_of_joining" control={control} render={({ field }) => (
              <DateInput field={field} id="date_of_joining" maxDate="today" invalid={!!errors.date_of_joining} />
            )} />
            <FormFeedback className="d-block">{errors.date_of_joining?.message}</FormFeedback>
          </Col>

          <Col md="6" className="mb-2">
            <Label>{t("Status")}</Label>
            <Controller name="is_active" control={control} render={({ field }) => (
              <Row className="px-1">
                <div className="form-check" style={{ width: "max-content" }}>
                  <Input id="active-yes" type="radio" checked={field.value === true} onChange={() => field.onChange(true)} />
                  <Label className="form-check-label" htmlFor="active-yes">{t("Active")}</Label>
                </div>
                <div className="form-check" style={{ width: "max-content" }}>
                  <Input id="active-no" type="radio" checked={field.value === false} onChange={() => field.onChange(false)} />
                  <Label className="form-check-label" htmlFor="active-no">{t("Inactive")}</Label>
                </div>
              </Row>
            )} />
          </Col>
        </Row>

        {/* Additional Locations */}
        <h5 className="mt-3 mb-2">{t("Additional Locations")}</h5>
        <Row>
          <Col sm="12" className="mb-2">
            <div className="d-flex align-items-end gap-2 mb-2">
              <div style={{ minWidth: 250 }}>
                <Select
                  isClearable
                  options={locationOptions.filter((opt) => {
                    const primaryLocId = watch("location_id")?.value || watch("location_id");
                    const assignedIds = locationAssignments.map((a) => a.location_id);
                    return opt.value !== primaryLocId && !assignedIds.includes(opt.value);
                  })}
                  className="react-select"
                  classNamePrefix="select"
                  placeholder={t("Select location...")}
                  value={newAssignmentLocation}
                  onChange={setNewAssignmentLocation}
                />
              </div>
              <Button type="button" color="primary" size="sm" disabled={!newAssignmentLocation || assignmentLoading} onClick={handleAddAssignment}>
                {assignmentLoading ? <Spinner size="sm" /> : t("Assign")}
              </Button>
            </div>
            {locationAssignments.length > 0 && (
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th>{t("Location")}</th>
                      <th>{t("Status")}</th>
                      <th style={{ width: 80 }}>{t("Action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationAssignments.map((a) => (
                      <tr key={a._id}>
                        <td>{a.location?.location_name || a.location_id}</td>
                        <td><span className={`badge bg-${a.is_active ? "success" : "secondary"}`}>{a.is_active ? t("Active") : t("Inactive")}</span></td>
                        <td className="text-center">
                          <Button type="button" color="flat-danger" size="sm" className="p-25" onClick={() => handleRemoveAssignment(a._id)}>x</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Col>
        </Row>

        <div className="mt-2">
          <Button type="submit" color="primary" disabled={loading}>
            {loading ? <Spinner size="sm" /> : t("Save Job Details")}
          </Button>
        </div>
      </form>
    </Fragment>
  );
};

export default JobDetailsTab;
