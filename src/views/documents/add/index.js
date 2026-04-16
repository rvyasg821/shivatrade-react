// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect, useRef } from "react";
import useFormLoading from "@src/hooks/useFormLoading";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getDocument,
  uploadDocument,
  updateDocument,
  getDocumentCategoryList,
  createDocumentCategory,
  cleanDocumentMessage,
  cleanDocumentState,
} from "../store";
import { getLocationList } from "@src/views/locations/store";
import { getEmployeeList } from "@src/views/employees/store";

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
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";

// ** Third Party Components
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, Download } from "react-feather";
import { storageTokenKeyName, hostRestApiUrl, hostRestApiPrefix } from "@constant/defaultValues";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const DocumentForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.document);
  const locationStore = useSelector((state) => state.location);
  const employeeStore = useSelector((state) => state.employee);
  const locationCtx = useSelector((state) => state.locationContext);
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["document"] || {};
  const roleName = authStore?.authUserItem?.role?.name;
  const isLocationAdmin = roleName === "Location Admin";
  const authUserLocationId = authStore?.authUserItem?.location_id;

  const isEmployee = roleName === "Employee";
  const authUserId = authStore?.authUserItem?._id;

  const isUpload = !id;
  const canWrite = isUpload || !!(modulePerms.can_update || modulePerms.can_add);

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  // Build category options from API-loaded store data
  const categoryOptions = (store?.categoryItems || []).map((c) => ({
    value: c.slug || c._id,
    label: c.name,
    requires_expiry: c.requires_expiry || false,
  }));

  const allLocationOptions = (locationStore?.locationItems || []).map((l) => ({
    value: l._id,
    label: l.location_name,
  }));

  const locationOptions = allLocationOptions;

  const employeeOptions = (employeeStore?.employeeItems || []).map((emp) => ({
    value: emp._id,
    label: `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim() || emp.email,
  }));

  const statusOptions = [
    { value: "active", label: t("Active") },
    { value: "archived", label: t("Archived") },
    { value: "pending_review", label: t("Pending Review") },
  ];

  const approvalStatusOptions = [
    { value: "approved", label: t("Approved") },
    { value: "pending", label: t("Pending") },
    { value: "rejected", label: t("Rejected") },
  ];
  const canChangeApproval = !isEmployee;

  // Derive whether expiry is required from selected category
  const requiresExpiry = selectedCategory?.requires_expiry || false;

  const Schema = yup.object().shape({
    title: yup.string().required(t("Title is required")),
    category_id: yup.string().required(t("Category is required")),
    expiry_date: requiresExpiry
      ? yup.string().required(t("Expiry date is required for this category"))
      : yup.string().nullable().optional(),
  });

  const {
    reset,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      user_id: "",
      location_id: "",
      expiry_date: "",
      status: "active",
      approved_status: "approved",
    },
    resolver: yupResolver(Schema),
  });

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getDocumentCategoryList());
    if (!isEmployee) {
      dispatch(getLocationList({ _limit: 500, _offset: 0, _order: "asc", _sort: "location_name" }));
      const empParams = { _limit: 500, _offset: 0 };
      if (isLocationAdmin && authUserLocationId) empParams.location_id = authUserLocationId;
      dispatch(getEmployeeList(empParams));
    }
    if (id) dispatch(getDocument(id));
    return () => dispatch(cleanDocumentState());
  }, [id]);

  // Re-fetch employees when location selection changes (not needed for Employee role)
  useEffect(() => {
    if (isEmployee) return;
    const empParams = { _limit: 500, _offset: 0 };
    if (selectedLocation?.value) empParams.location_id = selectedLocation.value;
    else if (isLocationAdmin && authUserLocationId) empParams.location_id = authUserLocationId;
    dispatch(getEmployeeList(empParams));
    // Clear employee selection if it no longer belongs to new location
    if (selectedEmployee) setSelectedEmployee(null);
  }, [selectedLocation?.value]);

  useEffect(() => {
    if (store?.actionFlag === "DOC_GET_SCS" && store?.documentItem) {
      const doc = store.documentItem;
      reset({
        title: doc.title || "",
        description: doc.description || "",
        category_id: doc.category_id || "",
        user_id: doc.user_id || "",
        location_id: doc.location_id || "",
        expiry_date: doc.expiry_date?.split("T")[0] || doc.expiry_date || "",
        status: doc.status || "active",
        approved_status: doc.approved_status || "pending",
      });
      if (doc.category_id) {
        const cat = categoryOptions.find((c) => c.value === doc.category_id);
        setSelectedCategory(cat || null);
      }
      if (doc.location_id) {
        const loc = locationOptions.find((l) => l.value === doc.location_id);
        setSelectedLocation(loc || null);
      }
      if (doc.user_id) {
        const emp = employeeOptions.find((e) => e.value === doc.user_id);
        setSelectedEmployee(emp || null);
      }
    }

    if (store?.actionFlag === "DOC_UPL_SCS" || store?.actionFlag === "DOC_UPD_SCS") {
      navigate(`${appsRoot}/documents`);
    }

    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanDocumentMessage());
  }, [store?.actionFlag, store?.success, store?.error]);

  // Re-apply employee after employee list loads
  useEffect(() => {
    if (store?.documentItem?.user_id && employeeOptions.length > 0 && !selectedEmployee) {
      const emp = employeeOptions.find((e) => e.value === store.documentItem.user_id);
      setSelectedEmployee(emp || null);
    }
  }, [employeeOptions.length]);

  // Pre-fill location in upload mode from navbar selected location
  useEffect(() => {
    if (isUpload && locationOptions.length > 0 && !selectedLocation) {
      const prefillId = locationCtx?.selectedLocationId;
      if (prefillId) {
        const opt = locationOptions.find((o) => o.value === prefillId);
        if (opt) setSelectedLocation(opt);
      }
    }
  }, [locationOptions.length, locationCtx?.selectedLocationId, isUpload]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setFileError(t("File size must be under 20MB"));
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(file);
  };

  const onSubmit = async (values) => {
    if (isUpload) {
      if (!selectedFile) {
        setFileError(t("Please select a file to upload"));
        return;
      }
      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", values.title);
        if (values.description) formData.append("description", values.description);
        formData.append("category_id", values.category_id);
        if (selectedEmployee?.value) formData.append("user_id", selectedEmployee.value);
        if (selectedLocation?.value) formData.append("location_id", selectedLocation.value);
        if (values.expiry_date) formData.append("expiry_date", values.expiry_date);
        if (canChangeApproval && values.approved_status) formData.append("approved_status", values.approved_status);

        await dispatch(uploadDocument(formData)).unwrap().catch(() => {});
      } finally {
        setSubmitting(false);
      }
    } else {
      setSubmitting(true);
      try {
        // Edit metadata only
        const payload = {
          title: values.title,
          description: values.description || "",
          category_id: values.category_id,
          user_id: selectedEmployee?.value || null,
          location_id: selectedLocation?.value || null,
          expiry_date: values.expiry_date || null,
          status: values.status,
          ...(canChangeApproval && { approved_status: values.approved_status }),
        };
        await dispatch(updateDocument({ id, data: payload })).unwrap().catch(() => {});
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDownload = async () => {
    try {
      const raw = localStorage.getItem(storageTokenKeyName);
      const token = raw ? JSON.parse(raw) : null;
      const res = await fetch(`${hostRestApiUrl}${hostRestApiPrefix}${API_ENDPOINTS.document.download}/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        Notification("Error", t("Download failed"), "warning");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc?.file_name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Download failed"), "warning");
    }
  };

  const doc = store?.documentItem;

  return (
    <Fragment>
      <div className="main-content documents">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isUpload
              ? t("Upload Document")
              : canWrite
              ? t("Edit Document")
              : t("View Document")}
          </h3>
          <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
          </Button>
        </div>

        {/* Current file info (edit/view mode) */}
        {id && doc && (
          <Card className="mb-2">
            <CardBody className="d-flex align-items-center gap-3">
              <FileText size={32} className="text-primary" />
              <div>
                <div className="fw-bold">{doc.file_name}</div>
                <div className="text-muted small">
                  {doc.file_type?.toUpperCase()} •{" "}
                  {doc.file_size
                    ? doc.file_size < 1024 * 1024
                      ? `${(doc.file_size / 1024).toFixed(1)} KB`
                      : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                    : ""}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                color="outline-primary"
                className="ms-auto"
                onClick={handleDownload}
              >
                <Download size={14} className="me-1" />
                {t("Download")}
              </Button>
            </CardBody>
          </Card>
        )}

        <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t("Document Details")}</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                {/* Row 1 — Title | Category */}
                <Col md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="title">
                    {t("Title")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="title"
                        autoComplete="off"
                        invalid={!!errors.title}
                        readOnly={!canWrite}
                      />
                    )}
                  />
                  <FormFeedback>{errors.title?.message}</FormFeedback>
                </Col>

                <Col md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="category_id">
                    {t("Category")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => {
                      const SelectComponent = isEmployee ? Select : CreatableSelect;
                      const extraProps = isEmployee ? {} : {
                        onCreateOption: (inputValue) => {
                          dispatch(createDocumentCategory({ name: inputValue, requires_expiry: false, is_active: true }))
                            .unwrap()
                            .then((res) => {
                              const newCat = res?.categoryItem;
                              if (newCat) {
                                const opt = { value: newCat.slug || newCat._id, label: newCat.name, requires_expiry: newCat.requires_expiry || false };
                                setSelectedCategory(opt);
                                field.onChange(opt.value);
                              }
                            })
                            .catch(() => {});
                        },
                        formatCreateLabel: (inputValue) => `${t("Create")} "${inputValue}"`,
                      };
                      return (
                        <SelectComponent
                          inputId="category_id"
                          classNamePrefix="select"
                          options={categoryOptions}
                          value={selectedCategory}
                          onChange={(opt) => {
                            setSelectedCategory(opt);
                            field.onChange(opt?.value || "");
                          }}
                          placeholder={t("Select category")}
                          isDisabled={!canWrite}
                          {...extraProps}
                        />
                      );
                    }}
                  />
                  {errors.category_id && (
                    <div className="text-danger small mt-1">{errors.category_id.message}</div>
                  )}
                </Col>

                {/* Row 2 — Location | Employee (hidden for Employee role) */}
                {!isEmployee && (
                  <>
                    <Col md={6} sm={12} className="mb-2">
                      <Label className="form-label" for="location_id">
                        {t("Location")}{" "}
                        {!isLocationAdmin && (
                          <span className="text-muted small">({t("optional")})</span>
                        )}
                      </Label>
                      <Select
                        inputId="location_id"
                        classNamePrefix="select"
                        options={locationOptions}
                        value={selectedLocation}
                        onChange={(opt) => setSelectedLocation(opt)}
                        placeholder={t("All locations")}
                        isClearable={!isLocationAdmin}
                        isDisabled={!canWrite || isLocationAdmin}
                      />
                    </Col>

                    <Col md={6} sm={12} className="mb-2">
                      <Label className="form-label" for="user_id">
                        {t("Employee")}{" "}
                        <span className="text-muted small">({t("optional")})</span>
                      </Label>
                      <Select
                        inputId="user_id"
                        classNamePrefix="select"
                        options={employeeOptions}
                        value={selectedEmployee}
                        onChange={(opt) => setSelectedEmployee(opt)}
                        placeholder={selectedLocation ? t("Select employee...") : t("Select a location first")}
                        isClearable
                        isDisabled={!canWrite}
                        noOptionsMessage={() => t("No employees found for this location")}
                      />
                    </Col>
                  </>
                )}

                {/* Row 3 — File (upload only) | Expiry Date */}
                {isUpload && (
                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">
                      {t("File")} <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="file"
                      innerRef={fileInputRef}
                      onChange={handleFileChange}
                      invalid={!!fileError}
                    />
                    {fileError && (
                      <FormFeedback className="d-block">{fileError}</FormFeedback>
                    )}
                    {selectedFile && (
                      <small className="text-muted">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </small>
                    )}
                  </Col>
                )}

                <Col md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="expiry_date">
                    {t("Expiry Date")}
                    {requiresExpiry && <span className="text-danger"> *</span>}
                  </Label>
                  <Controller
                    name="expiry_date"
                    control={control}
                    render={({ field }) => (
                      <DateInput
                        value={field.value}
                        id="expiry_date"
                        onChange={(dates, str, iso) => field.onChange(iso)}
                        disabled={!canWrite}
                      />
                    )}
                  />
                  <FormFeedback>{errors.expiry_date?.message}</FormFeedback>
                </Col>

                {/* Status — edit mode only */}
                {!isUpload && (
                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">{t("Status")}</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="select"
                          {...field}
                          disabled={!canWrite}
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Input>
                      )}
                    />
                  </Col>
                )}

                {/* Approval Status — visible to admins in both create and edit */}
                {canChangeApproval && (
                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">{t("Approval Status")}</Label>
                    <Controller
                      name="approved_status"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="select"
                          {...field}
                          disabled={!canWrite}
                        >
                          {approvalStatusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Input>
                      )}
                    />
                  </Col>
                )}

                {/* Row 4 — Description (full width) */}
                <Col sm={12} className="mb-2">
                  <Label className="form-label" for="description">
                    {t("Description")}
                  </Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="description"
                        type="textarea"
                        rows="3"
                        readOnly={!canWrite}
                      />
                    )}
                  />
                </Col>

                
              </Row>
            </CardBody>
          </Card>

          <div className="main-form-btn">
            {canWrite && (
              <div className="form-btn mt-2">
                <Button type="submit" color="primary" disabled={!store?.loading}>
                  {isUpload ? t("Upload") : t("Save")}
                </Button>
              </div>
            )}
            <div className="form-btn mt-2">
              <Button
                type="button"
                color="secondary"
                disabled={!store?.loading}
                onClick={() => navigate(`${appsRoot}/documents`)}
              >
                {t(canWrite ? "Cancel" : "Back")}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Fragment>
  );
};

export default DocumentForm;
