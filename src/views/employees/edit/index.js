// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getEmployee, createEmployee, updateEmployee, cleanEmployeeMessage } from "../store";
import { getLocationList } from "../../locations/store";
import { getCodeSettings } from "@src/views/company-settings/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Card,
  CardBody,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { ArrowLeft, User, MapPin, Briefcase, DollarSign, Users, Globe, Camera } from "react-feather";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Constant
import { appsRoot, hostRestApiUrl } from "@constant/defaultValues";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Tab Components
import PersonalDetailsTab from "./tabs/PersonalDetailsTab";
import AddressDetailsTab from "./tabs/AddressDetailsTab";
import JobDetailsTab from "./tabs/JobDetailsTab";
import FinancialDetailsTab from "./tabs/FinancialDetailsTab";
import EmergencyContactTab from "./tabs/EmergencyContactTab";
import ImmigrationTab from "./tabs/ImmigrationTab";
import FaceRegistrationTab from "./tabs/FaceRegistrationTab";

// ** Styles
import "@styles/react/apps/app-users.scss";

const EmployeeEdit = () => {
  const { id: paramId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Track employee ID — starts null for create mode, set after first save
  const [employeeId, setEmployeeId] = useState(paramId || null);
  const isCreateMode = !employeeId;

  const store = useSelector((state) => state.employee);
  const companyData = useSelector((state) => state.authentication?.companyData);
  const locationStore = useSelector((state) => state.location);

  const [activeTab, setActiveTab] = useState("personal");
  const [employeeData, setEmployeeData] = useState(null);

  // Check if hrm-compliance tool is enabled in subscription
  const subscribedTools = companyData?.tools || [];
  const hasComplianceTool = subscribedTools.some(
    (tool) => tool?.slug === "hrm-compliance" || tool?._id === "hrm-compliance"
  );

  const [faceCaptureEnabled, setFaceCaptureEnabled] = useState(false);
  useEffect(() => {
    // Check if face capture is enabled in attendance settings
    instance.get(API_ENDPOINTS.attendance.settings)
      .then(res => {
        if (res.data?.data?.face_capture_enabled) setFaceCaptureEnabled(true);
      })
      .catch(() => {});
  }, []);

  // Fetch locations and code settings for create mode
  const codeSettingsStore = useSelector((state) => state.companySettings?.codeSettings);
  useEffect(() => {
    if (isCreateMode) {
      dispatch(getLocationList({ _limit: 200 }));
      dispatch(getCodeSettings());
    }
  }, [isCreateMode, dispatch]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (employeeId) {
      dispatch(getEmployee(employeeId));
    }
  }, [employeeId]);

  useEffect(() => {
    if (store?.actionFlag === "EMP_SCS" && store?.employeeItem) {
      setEmployeeData(store.employeeItem);
    }

    if (store?.actionFlag === "EMP_UPDT" && store?.employeeItem) {
      setEmployeeData(store.employeeItem);
    }

    // Handle employee creation — update ID, URL, and move to next tab
    if (store?.actionFlag === "EMP_CRTD" && store?.employeeItem) {
      const newId = store.employeeItem._id;
      setEmployeeId(newId);
      setEmployeeData(store.employeeItem);
      // Update URL without full page reload
      navigate(`${appsRoot}/employees/edit/${newId}`, { replace: true });
      // Move to next tab (Job Details)
      setActiveTab("job");
    }

    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage(null));
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  const toggleTab = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const handleSaveTab = async (tabData) => {
    if (isCreateMode) {
      // First tab save — create the employee
      try {
        await dispatch(createEmployee(tabData)).unwrap();
      } catch {
        // Error handled by useEffect watching store?.error
      }
      return;
    }
    if (!employeeId) return;
    try {
      await dispatch(updateEmployee({ id: employeeId, data: tabData })).unwrap();
      dispatch(getEmployee(employeeId));
    } catch {
      // Error handled by useEffect watching store?.error
    }
  };

  function getBackendImageUrl(photo) {
    if (typeof photo !== "string" || !photo.trim()) return null;
    if (photo.startsWith("http")) return photo;
    const cleanPath = photo.replace(/^\/+/, "");
    return `${hostRestApiUrl}/${cleanPath}`;
  }

  const tabs = [
    { id: "personal", label: t("Personal"), icon: <User size={16} /> },
    { id: "address", label: t("Address"), icon: <MapPin size={16} /> },
    { id: "job", label: t("Job Details"), icon: <Briefcase size={16} /> },
    { id: "financial", label: t("Financial"), icon: <DollarSign size={16} /> },
    { id: "emergency", label: t("Emergency"), icon: <Users size={16} /> },
    ...(faceCaptureEnabled && !isCreateMode
      ? [{ id: "faceid", label: t("Face ID"), icon: <Camera size={16} /> }]
      : []),
  ];

  return (
    <Fragment>
      <div className="main-content employees">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <h3 className="mb-0">
              {isCreateMode ? t("Add Employee") : t("Edit Employee")}
              {employeeData && (
                <span className="text-muted fw-normal ms-1" style={{ fontSize: "0.85rem" }}>
                  - {employeeData.first_name} {employeeData.last_name}
                </span>
              )}
            </h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`${appsRoot}/employees`)}
            >
              <ArrowLeft size={17} />
            </button>
          </div>
        </div>

        <Card>
          <CardBody className="p-0">
            <Nav tabs className="mb-0 border-bottom px-2 pt-1">
              {tabs.map((tab) => {
                const isDisabled = isCreateMode && tab.id !== "personal";
                return (
                  <NavItem key={tab.id}>
                    <NavLink
                      active={activeTab === tab.id}
                      onClick={() => !isDisabled && toggleTab(tab.id)}
                      className={`d-flex align-items-center gap-50 ${isDisabled ? 'text-muted' : 'cursor-pointer'}`}
                      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </NavLink>
                  </NavItem>
                );
              })}
            </Nav>

            <div className="p-2">
              <TabContent activeTab={activeTab}>
                <TabPane tabId="personal">
                  {activeTab === "personal" && (
                    <PersonalDetailsTab
                      employeeData={employeeData}
                      onSave={handleSaveTab}
                      loading={!store?.loading}
                      getBackendImageUrl={getBackendImageUrl}
                      isCreateMode={isCreateMode}
                      locations={locationStore?.locationItems || []}
                      codeSettings={codeSettingsStore}
                    />
                  )}
                </TabPane>

                <TabPane tabId="address">
                  {activeTab === "address" && (
                    <AddressDetailsTab
                      employeeData={employeeData}
                      onSave={handleSaveTab}
                      loading={!store?.loading}
                    />
                  )}
                </TabPane>

                <TabPane tabId="job">
                  {activeTab === "job" && (
                    <JobDetailsTab
                      employeeData={employeeData}
                      employeeId={employeeId}
                      onSave={handleSaveTab}
                      loading={!store?.loading}
                    />
                  )}
                </TabPane>

                <TabPane tabId="financial">
                  {activeTab === "financial" && (
                    <FinancialDetailsTab
                      employeeData={employeeData}
                      onSave={handleSaveTab}
                      loading={!store?.loading}
                    />
                  )}
                </TabPane>

                <TabPane tabId="emergency">
                  {activeTab === "emergency" && (
                    <EmergencyContactTab
                      employeeData={employeeData}
                      onSave={handleSaveTab}
                      loading={!store?.loading}
                    />
                  )}
                </TabPane>

                {faceCaptureEnabled && !isCreateMode && (
                  <TabPane tabId="faceid">
                    {activeTab === "faceid" && (
                      <FaceRegistrationTab
                        employeeData={employeeData}
                        employeeId={employeeId}
                        onSave={handleSaveTab}
                        loading={!store?.loading}
                        getBackendImageUrl={getBackendImageUrl}
                      />
                    )}
                  </TabPane>
                )}

                <TabPane tabId="documents">
                </TabPane>

                <TabPane tabId="contracts">
                </TabPane>

              </TabContent>
            </div>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default EmployeeEdit;
