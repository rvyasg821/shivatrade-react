// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import useFormLoading from "@src/hooks/useFormLoading";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getHolidayCalendar,
  createHolidayCalendar,
  updateHolidayCalendar,
  cleanHolidayCalendarMessage,
  cleanHolidayCalendarState,
  importUkHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../store";
import { getLocationList } from "@src/views/locations/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Form,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Label,
  Input,
  Button,
  FormFeedback,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import DataTable from "react-data-table-component";

// ** Third Party Components
import Select from "react-select";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { ArrowLeft, PlusCircle, Edit2, Trash2, Download } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from '@src/utility/dateFormat'

const HolidayCalendarForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.holidayCalendar);
  const locationStore = useSelector((state) => state.location);
  const locationCtx = useSelector((state) => state.locationContext);
  const companyItem = useSelector((state) => state.company?.companyItem);
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["holiday_calendar"] || {};
  const roleName = authStore?.authUserItem?.role?.name;
  const isLocationAdmin = roleName === "Location Admin";
  // Admins always have write access even without explicit module perms — keeps
  // the Add Holiday button + row Actions visible for them (matches the listing).
  const isSystemAdmin = roleName === "Super Admin" || roleName === "Admin";
  const isCompanyAdmin = roleName === "Company Admin";
  const authUserLocationId = authStore?.authUserItem?.location_id;

  const isEditMode = !!id;

  // Location admins cannot edit company-wide calendars or other locations' calendars
  const calendarIsCompanyWide = isEditMode && !store?.holidayCalendarItem?.location_id;
  const calendarIsOtherLocation = isEditMode
    && !!store?.holidayCalendarItem?.location_id
    && !!authUserLocationId
    && store?.holidayCalendarItem?.location_id !== authUserLocationId;
  const canWrite =
    (isSystemAdmin ||
      isCompanyAdmin ||
      modulePerms.can_update ||
      modulePerms.can_add)
    && !(isLocationAdmin && (calendarIsCompanyWide || calendarIsOtherLocation));

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  // Location options for Select
  const [locationOptions, setLocationOptions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Holiday modal state
  const [holidayModal, setHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [importingUk, setImportingUk] = useState(false);

  // Determine if the relevant country is United Kingdom
  // Check location country first, then company country, then selected_country (ISO code)
  const relevantCountry = (() => {
    if (selectedLocation?.value && locationStore?.locationItems?.length) {
      const loc = locationStore.locationItems.find((l) => l._id === selectedLocation.value);
      if (loc?.country) return loc.country;
    }
    return companyItem?.country || companyItem?.selected_country || authStore?.authUserItem?.company?.country || authStore?.authUserItem?.company?.selected_country || "";
  })();
  const isUkCountry = /^(united kingdom|uk|gb|great britain|england|scotland|wales|northern ireland)$/i.test((relevantCountry || "").trim());

  // ── Validation schema ──
  const CalendarSchema = yup.object().shape({
    name: yup.string().required(t("Calendar name is required")),
    year: yup
      .number()
      .typeError(t("Year must be a number"))
      .required(t("Year is required"))
      .min(2000, t("Year must be 2000 or later"))
      .max(2100, t("Year must be 2100 or earlier")),
  });

  const HolidaySchema = yup.object().shape({
    name: yup.string().required(t("Holiday name is required")),
    date: yup.string().required(t("Date is required")),
    type: yup.string().required(t("Type is required")),
  });

  // ── Calendar form ──
  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      name: "",
      year: new Date().getFullYear(),
      location_id: "",
      is_active: true,
    },
    resolver: yupResolver(CalendarSchema),
  });

  // ── Holiday form ──
  const {
    reset: resetHoliday,
    control: controlHoliday,
    handleSubmit: handleSubmitHoliday,
    formState: { errors: holidayErrors },
  } = useForm({
    mode: "all",
    defaultValues: {
      name: "",
      date: "",
      type: "company_holiday",
      is_recurring: false,
      notes: "",
    },
    resolver: yupResolver(HolidaySchema),
  });

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getLocationList({ _limit: 500, _offset: 0, _order: "asc", _sort: "location_name" }));
    dispatch(getCompanyDetails());
    if (isEditMode) {
      dispatch(getHolidayCalendar(id));
    }
    return () => {
      dispatch(cleanHolidayCalendarState());
    };
  }, [id]);

  // Populate location options (Location Admin sees only their own location)
  useEffect(() => {
    if (locationStore?.locationItems?.length) {
      const opts = locationStore.locationItems.map((loc) => ({
        value: loc._id,
        label: loc.location_name,
      }));
      const filtered = opts;
      setLocationOptions(filtered);
    }
  }, [locationStore?.locationItems]);

  // Handle store flags
  useEffect(() => {
    if (store?.actionFlag === "HC_CRT_SCS" || store?.actionFlag === "HC_UPD_SCS") {
      navigate(`${appsRoot}/holiday-calendar`);
    }

    if (store?.actionFlag === "HC_GET_SCS" && store?.holidayCalendarItem) {
      const item = store.holidayCalendarItem;
      reset({
        _id: item._id,
        name: item.name,
        year: item.year,
        location_id: item.location_id || "",
        is_active: item.is_active ?? true,
      });

      if (item.location_id && locationOptions.length > 0) {
        const opt = locationOptions.find((o) => o.value === item.location_id);
        setSelectedLocation(opt || null);
      }
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
    if (store?.success || store?.error) {
      dispatch(cleanHolidayCalendarMessage());
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  // Re-apply location once options load (for edit mode)
  useEffect(() => {
    if (store?.holidayCalendarItem?.location_id && locationOptions.length > 0 && !selectedLocation) {
      const opt = locationOptions.find((o) => o.value === store.holidayCalendarItem.location_id);
      setSelectedLocation(opt || null);
    }
  }, [locationOptions]);

  // Pre-fill location in add mode
  // Location Admin: always use their own location_id
  // Others: use global context selected location
  useEffect(() => {
    if (!isEditMode && locationOptions.length > 0 && !selectedLocation) {
      const prefillId = locationCtx?.selectedLocationId;
      if (prefillId) {
        const opt = locationOptions.find((o) => o.value === prefillId);
        if (opt) setSelectedLocation(opt);
      }
    }
  }, [locationOptions, locationCtx?.selectedLocationId, isEditMode]);

  // ── Import UK Bank Holidays ──
  const handleImportUk = async () => {
    const currentYear = store?.holidayCalendarItem?.year || new Date().getFullYear();
    const calId = store?.holidayCalendarItem?._id || id;

    mySwal
      .fire({
        title: t("Import UK Bank Holidays"),
        text: t(`This will import all UK bank holidays for ${currentYear}. Existing holidays will not be duplicated.`),
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#7367f0",
        cancelButtonColor: "#6c757d",
        confirmButtonText: t("Import"),
        cancelButtonText: t("Cancel"),
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          setImportingUk(true);
          try {
            await dispatch(importUkHolidays({ year: currentYear, calendar_id: calId })).unwrap();
            dispatch(getHolidayCalendar(id));
          } catch {
            // Error handled by useEffect watching store?.error
          } finally {
            setImportingUk(false);
          }
        }
      });
  };

  // ── Open holiday modal ──
  const openAddHoliday = () => {
    setEditingHoliday(null);
    resetHoliday({
      name: "",
      date: "",
      type: "company_holiday",
      is_recurring: false,
      notes: "",
    });
    setHolidayModal(true);
  };

  const openEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    resetHoliday({
      name: holiday.name,
      date: holiday.date?.split("T")[0] || holiday.date,
      type: holiday.type || "company_holiday",
      is_recurring: holiday.is_recurring || false,
      notes: holiday.notes || "",
    });
    setHolidayModal(true);
  };

  // ── Submit holiday ──
  const onSubmitHoliday = async (values) => {
    const calId = store?.holidayCalendarItem?._id || id;
    const payload = {
      calendar_id: calId,
      company_id: store?.holidayCalendarItem?.company_id,
      name: values.name,
      date: values.date,
      type: values.type,
      is_recurring: values.is_recurring || false,
      notes: values.notes || "",
    };

    setSubmitting(true);
    try {
      if (editingHoliday?._id) {
        await dispatch(updateHoliday({ id: editingHoliday._id, data: payload })).unwrap();
      } else {
        await dispatch(createHoliday(payload)).unwrap();
      }
      setHolidayModal(false);
    } catch {
      // Error handled by useEffect watching store?.error
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete holiday ──
  const handleDeleteHoliday = (holiday) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t(`Delete "${holiday.name}"?`),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel"),
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          await dispatch(deleteHoliday(holiday._id)).unwrap().catch(() => {});
        }
      });
  };

  // ── Submit calendar ──
  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      year: Number(values.year),
      location_id: selectedLocation?.value || null,
      is_active: values.is_active ?? true,
    };

    setSubmitting(true);
    try {
      if (isEditMode && id) {
        await dispatch(updateHolidayCalendar({ id, data: payload })).unwrap().catch(() => {});
      } else {
        await dispatch(createHolidayCalendar(payload)).unwrap().catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = [
    { value: "bank_holiday", label: t("Bank Holiday") },
    { value: "company_holiday", label: t("Company Holiday") },
    { value: "location_holiday", label: t("Location Holiday") },
  ];

  const holidays = store?.holidayCalendarItem?.holidays || [];

  return (
    <Fragment>
      <div className="main-content holiday-calendar">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode
              ? canWrite
                ? t("Edit Holiday Calendar")
                : t("View Holiday Calendar")
              : t("Add Holiday Calendar")}
          </h3>
          <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
          {/* ── Calendar Details ── */}
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t("Calendar Details")}</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="name">
                    {t("Calendar Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="name"
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder={t("e.g. UK Bank Holidays 2026")}
                        invalid={!!errors.name}
                        readOnly={!canWrite}
                      />
                    )}
                  />
                  <FormFeedback>{errors.name?.message}</FormFeedback>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="year">
                    {t("Year")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="year"
                    name="year"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        min="2000"
                        max="2100"
                        invalid={!!errors.year}
                        readOnly={!canWrite}
                      />
                    )}
                  />
                  <FormFeedback>{errors.year?.message}</FormFeedback>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="location_id">
                    {t("Location")}{" "}
                    {!isLocationAdmin && (
                      <span className="text-muted small">({t("leave blank for company-wide")})</span>
                    )}
                  </Label>
                  <Select
                    inputId="location_id"
                    classNamePrefix="select"
                    options={locationOptions}
                    value={selectedLocation}
                    onChange={(opt) => setSelectedLocation(opt)}
                    placeholder={t("All locations (company-wide)")}
                    isClearable={!isLocationAdmin}
                    isSearchable
                    isDisabled={!canWrite}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-1">
                  <Label className="form-label d-block">{t("Status")}</Label>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Row className="px-1">
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            id="is_active_yes"
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            disabled={!canWrite}
                          />
                          <Label className="form-check-label" for="is_active_yes">
                            {t("Active")}
                          </Label>
                        </div>
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            id="is_active_no"
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            disabled={!canWrite}
                          />
                          <Label className="form-check-label" for="is_active_no">
                            {t("Inactive")}
                          </Label>
                        </div>
                      </Row>
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Action Buttons ── */}
          <div className="main-form-btn">
            {canWrite && (
              <div className="form-btn mt-2">
                <Button type="submit" color="primary" disabled={!store?.loading}>
                  {t("Save Calendar")}
                </Button>
              </div>
            )}
            <div className="form-btn mt-2">
              <Button
                type="button"
                color="secondary"
                disabled={!store?.loading}
                onClick={() => navigate(`${appsRoot}/holiday-calendar`)}
              >
                {t(canWrite ? "Cancel" : "Back")}
              </Button>
            </div>
          </div>
        </Form>

        {/* ── Holidays Section (only in edit mode) ── */}
        {isEditMode && (
          <Card className="mt-3">
            <CardHeader className="border-bottom py-1">
              <div className="d-flex align-items-center justify-content-between w-100">
                <CardTitle tag="h5" className="mb-0">{t("Holidays")}</CardTitle>
                {canWrite && (
                  <div className="d-flex gap-1">
                    {isUkCountry && (
                      <Button
                        size="sm"
                        color="warning"
                        outline
                        onClick={handleImportUk}
                        disabled={importingUk}
                      >
                        {importingUk ? (
                          <Spinner size="sm" className="me-1" />
                        ) : (
                          <Download size={14} className="me-1" />
                        )}
                        {t("Import UK Bank Holidays")}
                      </Button>
                    )}
                    <Button size="sm" color="primary" onClick={openAddHoliday}>
                      <PlusCircle size={14} className="me-1" />
                      {t("Add Holiday")}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable
                columns={[
                  {
                    name: t("Name"),
                    selector: (row) => row.name,
                    cell: (row) => row.name,
                    sortable: true,
                  },
                  {
                    name: t("Date"),
                    selector: (row) => row.date,
                    sortable: true,
                    cell: (row) => formatDate(row.date?.split("T")[0] || row.date),
                  },
                  {
                    name: t("Type"),
                    cell: (row) => (
                      <span className={`doc-badge ${row.type === 'bank_holiday' ? 'doc-badge-green' : row.type === 'location_holiday' ? 'doc-badge-orange' : 'doc-badge-gray'}`}>
                        {row.type === "bank_holiday" ? t("Bank Holiday") : row.type === "location_holiday" ? t("Location Holiday") : t("Company Holiday")}
                      </span>
                    ),
                  },
                  {
                    name: t("Recurring"),
                    cell: (row) =>
                      row.is_recurring ? (
                        <span className="doc-badge doc-badge-green">{t("Yes")}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      ),
                  },
                  {
                    name: t("Notes"),
                    cell: (row) => (
                      <span
                        className="text-truncate d-inline-block"
                        style={{ maxWidth: 200 }}
                        title={row.notes || ""}
                      >
                        {row.notes || <span className="text-muted">—</span>}
                      </span>
                    ),
                  },
                  ...(canWrite ? [{
                    name: t("Actions"),
                    cell: (row) => (
                      <div className="d-flex gap-1">
                        <span
                          className="cursor-pointer"
                          onClick={() => openEditHoliday(row)}
                        >
                          <Edit2 size={15} className="text-primary" />
                        </span>
                        <span
                          className="cursor-pointer"
                          onClick={() => handleDeleteHoliday(row)}
                        >
                          <Trash2 size={15} className="text-danger" />
                        </span>
                      </div>
                    ),
                  }] : []),
                ]}
                data={[...holidays].sort((a, b) => new Date(a.date) - new Date(b.date))}
                noHeader
                pagination={false}
                persistTableHead
                noDataComponent={
                  <p className="text-muted text-center py-3 mb-0">
                    {t("No holidays added yet. Add individual holidays or import UK bank holidays.")}
                  </p>
                }
                customStyles={{
                  headRow: {
                    style: {
                      backgroundColor: "#f3f2f7",
                      borderTop: "1px solid #ebe9f1",
                      minHeight: "38px",
                    },
                  },
                  headCells: {
                    style: {
                      color: "#09418B",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                      letterSpacing: "0.5px",
                      paddingLeft: "1.5rem",
                      paddingRight: "1.5rem",
                    },
                  },
                  rows: {
                    style: {
                      backgroundColor: "#ffffff",
                      borderBottomColor: "#ebe9f1",
                      minHeight: "53px",
                    },
                    highlightOnHoverStyle: {
                      backgroundColor: "#f8f8f8",
                      borderBottomColor: "#ebe9f1",
                    },
                  },
                  cells: {
                    style: {
                      paddingLeft: "1.5rem",
                      paddingRight: "1.5rem",
                    },
                  },
                }}
              />
            </CardBody>
          </Card>
        )}
      </div>

      {/* ── Holiday Modal ── */}
      <Modal isOpen={holidayModal} toggle={() => setHolidayModal(!holidayModal)} centered>
        <ModalHeader toggle={() => setHolidayModal(!holidayModal)}>
          {editingHoliday ? t("Edit Holiday") : t("Add Holiday")}
        </ModalHeader>
        <Form onSubmit={handleSubmitHoliday(onSubmitHoliday)}>
          <ModalBody>
            <Row>
              <Col sm={12} className="mb-2">
                <Label className="form-label" for="hol-name">
                  {t("Holiday Name")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  id="hol-name"
                  name="name"
                  control={controlHoliday}
                  render={({ field }) => (
                    <Input
                      {...field}
                      autoComplete="off"
                      placeholder={t("e.g. Christmas Day")}
                      invalid={!!holidayErrors.name}
                    />
                  )}
                />
                <FormFeedback>{holidayErrors.name?.message}</FormFeedback>
              </Col>

              <Col sm={12} className="mb-2">
                <Label className="form-label" for="hol-date">
                  {t("Date")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  id="hol-date"
                  name="date"
                  control={controlHoliday}
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      id="hol-date"
                      onChange={(dates, str, iso) => field.onChange(iso)}
                    />
                  )}
                />
                <FormFeedback>{holidayErrors.date?.message}</FormFeedback>
              </Col>

              <Col sm={12} className="mb-2">
                <Label className="form-label" for="hol-type">
                  {t("Type")} <span className="text-danger">*</span>
                </Label>
                <Controller
                  id="hol-type"
                  name="type"
                  control={controlHoliday}
                  render={({ field }) => (
                    <Input type="select" {...field} invalid={!!holidayErrors.type}>
                      <option value="bank_holiday">{t("Bank Holiday")}</option>
                      <option value="company_holiday">{t("Company Holiday")}</option>
                      <option value="location_holiday">{t("Location Holiday")}</option>
                    </Input>
                  )}
                />
                <FormFeedback>{holidayErrors.type?.message}</FormFeedback>
              </Col>

              <Col sm={12} className="mb-2">
                <div className="form-check">
                  <Controller
                    id="hol-recurring"
                    name="is_recurring"
                    control={controlHoliday}
                    render={({ field }) => (
                      <Input
                        type="checkbox"
                        id="hol-recurring"
                        className="form-check-input"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                  <Label className="form-check-label" for="hol-recurring">
                    {t("Recurring annually")}
                  </Label>
                </div>
              </Col>

              <Col sm={12} className="mb-1">
                <Label className="form-label" for="hol-notes">
                  {t("Notes")}
                </Label>
                <Controller
                  id="hol-notes"
                  name="notes"
                  control={controlHoliday}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="textarea"
                      rows="2"
                      autoComplete="off"
                      placeholder={t("Optional notes...")}
                    />
                  )}
                />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button type="submit" color="primary">
              {editingHoliday ? t("Update") : t("Add")}
            </Button>
            <Button
              type="button"
              color="secondary"
              onClick={() => setHolidayModal(false)}
            >
              {t("Cancel")}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Fragment>
  );
};

export default HolidayCalendarForm;
