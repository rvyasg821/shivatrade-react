// Employee add/edit — multi-step wizard (same look as the lead / quotation
// wizards). Step 1 merges Personal + Job because those hold the required
// fields; the rest are optional sections. Each step reuses its existing
// self-contained tab form (own RHF + Save), so the create-mode sequencing
// (Personal creates the employee → Job + later steps unlock) is preserved.

import { Fragment, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getEmployee,
  createEmployee,
  updateEmployee,
  cleanEmployeeMessage,
} from "../store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import { Card, CardBody, Button, Spinner } from "reactstrap";
import { ChevronLeft, ChevronRight, Save } from "react-feather";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { ArrowLeft, User, MapPin, DollarSign, Users, Camera } from "react-feather";

// ** Custom Components
import Notification from "@components/toast/notification";
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";

// ** Constant
import { appsRoot, hostRestApiUrl } from "@constant/defaultValues";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Step (tab) Components — reused as-is
import PersonalDetailsTab from "./tabs/PersonalDetailsTab";
import AddressDetailsTab from "./tabs/AddressDetailsTab";
import JobDetailsTab from "./tabs/JobDetailsTab";
import FinancialDetailsTab from "./tabs/FinancialDetailsTab";
import EmergencyContactTab from "./tabs/EmergencyContactTab";

// ** Styles
import "@styles/react/apps/app-users.scss";
import "@src/views/_shared/wizard/wizard.scss";

const EmployeeEdit = () => {
  const { id: paramId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Track employee ID — starts null for create mode, set after first save
  const [employeeId, setEmployeeId] = useState(paramId || null);
  const isCreateMode = !employeeId;
  const isEdit = !isCreateMode;

  const store = useSelector((state) => state.employee);
  const companyData = useSelector((state) => state.authentication?.companyData);

  const [employeeData, setEmployeeData] = useState(null);

  // ── Wizard navigation state ───────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));
  const [submitting, setSubmitting] = useState(false);

  // Imperative handles to each step's form — the footer Save drives them.
  const personalRef = useRef(null);
  const jobRef = useRef(null);
  const addressRef = useRef(null);
  const financialRef = useRef(null);
  const emergencyRef = useRef(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (employeeId) dispatch(getEmployee(employeeId));
  }, [employeeId]);

  useEffect(() => {
    if (store?.actionFlag === "EMP_SCS" && store?.employeeItem) {
      setEmployeeData(store.employeeItem);
    }
    if (store?.actionFlag === "EMP_UPDT" && store?.employeeItem) {
      setEmployeeData(store.employeeItem);
    }
    // Employee created — capture the id + URL; the Job form unlocks in step 1.
    if (store?.actionFlag === "EMP_CRTD" && store?.employeeItem) {
      const newId = store.employeeItem._id;
      setEmployeeId(newId);
      setEmployeeData(store.employeeItem);
      navigate(`${appsRoot}/employees/edit/${newId}`, { replace: true });
    }

    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage(null));
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.loading]);

  // Persist (create or update). Returns true on success, false on error —
  // toasts are surfaced by the store effect either way.
  const handleSaveTab = async (tabData) => {
    if (isCreateMode) {
      try {
        await dispatch(createEmployee(tabData)).unwrap();
        return true;
      } catch {
        return false;
      }
    }
    if (!employeeId) return false;
    try {
      await dispatch(updateEmployee({ id: employeeId, data: tabData })).unwrap();
      dispatch(getEmployee(employeeId));
      return true;
    } catch {
      return false;
    }
  };

  function getBackendImageUrl(photo) {
    if (typeof photo !== "string" || !photo.trim()) return null;
    if (photo.startsWith("http")) return photo;
    return `${hostRestApiUrl}/${photo.replace(/^\/+/, "")}`;
  }

  // ── Steps ─────────────────────────────────────────────────────────────
  const steps = [
    { key: "basic", label: t("Basic Info"), icon: User },
    { key: "address", label: t("Address"), icon: MapPin },
    { key: "financial", label: t("Financial"), icon: DollarSign },
    { key: "emergency", label: t("Emergency"), icon: Users },
  ];

  const isFirst = activeStep === 0;
  const isLast = activeStep === steps.length - 1;

  const stepKey = steps[activeStep]?.key;

  // Validate + collect ONE step's payload WITHOUT saving. getData() triggers
  // that form's validation (highlighting fields) and resolves the payload,
  // `undefined` on a validation failure, or `null` for nothing to save.
  // All steps stay mounted, so edits on inactive steps are still collected.
  const collectStep = async (key) => {
    if (key === "basic") {
      const p = personalRef.current ? await personalRef.current.getData() : {};
      if (p === undefined) return { ok: false };
      let j = {};
      if (jobRef.current) {
        const jd = await jobRef.current.getData();
        if (jd === undefined) return { ok: false };
        j = jd || {};
      }
      return { ok: true, payload: { ...(p || {}), ...j } };
    }
    const refByStep = {
      address: addressRef,
      financial: financialRef,
      emergency: emergencyRef,
    };
    const r = refByStep[key];
    const d = r?.current ? await r.current.getData() : null;
    if (d === undefined) return { ok: false };
    if (d === null) return { ok: true, payload: null }; // nothing to save
    return { ok: true, payload: d };
  };

  // Save button — collects EVERY step and persists in ONE call. The backend
  // create now accepts the full payload, so this is a single create (add) or
  // update (edit) with a single success/error toast. A validation failure on
  // any step jumps to that step and warns.
  const onSave = async () => {
    const keys = steps.map((s) => s.key);
    setSubmitting(true);
    try {
      let merged = {};
      for (const key of keys) {
        const { ok, payload } = await collectStep(key);
        if (!ok) {
          const idx = steps.findIndex((s) => s.key === key);
          if (idx >= 0) setActiveStep(idx);
          Notification(
            "Validation",
            t("Please complete the required fields before saving."),
            "warning"
          );
          return;
        }
        if (payload) merged = { ...merged, ...payload };
      }
      if (Object.keys(merged).length > 0) {
        await handleSaveTab(merged);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToStep = (i) => {
    if (i === activeStep) return;
    setActiveStep(i);
    setVisited((v) => new Set(v).add(i));
  };

  // Next only validates the current step (highlighting + error toast) and
  // advances — it never saves. Nothing is persisted until the final Save
  // (deferred-create wizard, same as quotation).
  const onNext = async () => {
    const { ok } = await collectStep(stepKey);
    if (!ok) {
      Notification(
        "Validation",
        t("Please complete the required fields before continuing."),
        "warning"
      );
      return;
    }
    const target = Math.min(activeStep + 1, steps.length - 1);
    setActiveStep(target);
    setVisited((v) => new Set(v).add(target));
  };

  const onBack = () => setActiveStep((s) => Math.max(s - 1, 0));
  const tabProps = { employeeData };

  return (
    <Fragment>
      <div className="main-content employees">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isCreateMode ? t("Add Employee") : t("Edit Employee")}
            {employeeData && (
              <span
                className="text-muted fw-normal ms-1"
                style={{ fontSize: "0.85rem" }}
              >
                - {employeeData.first_name} {employeeData.last_name}
              </span>
            )}
          </h3>
          <Button
            color="primary"
            size="sm"
            outline
            onClick={() => navigate(-1)}
            className="d-flex align-items-center"
          >
            <ArrowLeft size={16} className="me-50" /> {t("Back")}
          </Button>
        </div>

        <Card>
          <CardBody className="quotation-wizard">
            <WizardHeader
              steps={steps}
              activeStep={activeStep}
              visited={visited}
              onStepClick={goToStep}
              isEdit={isEdit}
            />

            {/* All steps stay MOUNTED (only the active one is visible) so edits
                made on one step aren't lost when you move to another — Save
                then persists every step's data together. */}
            <div className="wizard-step-body mt-2">
              <div style={{ display: stepKey === "basic" ? "block" : "none" }}>
                <PersonalDetailsTab
                  ref={personalRef}
                  {...tabProps}
                  getBackendImageUrl={getBackendImageUrl}
                  isCreateMode={isCreateMode}
                />
                <div className="mt-3 pt-2 border-top">
                  <h5 className="fw-bolder mb-2">{t("Job Details")}</h5>
                  <JobDetailsTab
                    ref={jobRef}
                    {...tabProps}
                    employeeId={employeeId}
                    isCreateMode={isCreateMode}
                  />
                </div>
              </div>

              <div style={{ display: stepKey === "address" ? "block" : "none" }}>
                <AddressDetailsTab ref={addressRef} {...tabProps} />
              </div>

              <div
                style={{ display: stepKey === "financial" ? "block" : "none" }}
              >
                <FinancialDetailsTab ref={financialRef} {...tabProps} />
              </div>

              <div
                style={{ display: stepKey === "emergency" ? "block" : "none" }}
              >
                <EmergencyContactTab ref={emergencyRef} {...tabProps} />
              </div>
            </div>

            {/* Footer — single Save per step (drives the active step's form),
                plus Next/Back/Cancel. Same pattern as the quotation wizard. */}
            <div className="wizard-footer mt-2">
              <div className="footer-left">
                <Button
                  type="button"
                  color="secondary"
                  outline
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  {t("Cancel")}
                </Button>
                {!isFirst && (
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={onBack}
                    disabled={submitting}
                  >
                    <ChevronLeft size={15} className="me-25" />
                    {t("Back")}
                  </Button>
                )}
              </div>
              <div className="footer-right">
                <Button
                  type="button"
                  color="primary"
                  outline={!isLast}
                  onClick={onSave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Spinner size="sm" />
                  ) : (
                    <Fragment>
                      <Save size={15} className="me-25" />
                      {t("Save")}
                    </Fragment>
                  )}
                </Button>
                {!isLast && (
                  <Button
                    type="button"
                    color="primary"
                    onClick={onNext}
                    disabled={submitting}
                  >
                    {t("Next")}
                    <ChevronRight size={15} className="ms-25" />
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default EmployeeEdit;
