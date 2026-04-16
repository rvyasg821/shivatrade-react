// ** React Imports
import { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { createTool, cleanToolsMessage } from "../store";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Label,
  Button,
  CardBody,
  CardHeader,
  FormFeedback,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";

// ** Custom Components
import ToolsErrorBoundary from "../components/ToolsErrorBoundary";
import ToolsErrorAlert from "../components/ToolsErrorAlert";
import ToolTabbedInterface from "../components/ToolTabbedInterface";

// ** Role-based utilities
import { getUserRole, hasToolsPermission, isSuperAdmin } from "../utils/roleUtils";

// ** Constants
import { appsRoot } from "@constant/defaultValues";

const ToolAdd = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.tools);
  const authStore = useSelector((state) => state.auth);

  // ** Role-based variables
  const userRole = getUserRole(authStore);
  const isUserSuperAdmin = isSuperAdmin(userRole);
  const canAddTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_add');

  // ** State
  const [currentError, setCurrentError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [toolSettings, setToolSettings] = useState([]);
  const [toolSchedules, setToolSchedules] = useState([]);

  // ** Form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      status: 1
    }
  });

  // ** Effects
  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanToolsMessage(null));
    }

    if (store?.actionFlag === "TOOL_CRTD") {
      navigate(`${appsRoot}/tools`);
    }

    if (store?.success) {
      setCurrentError(null);
    }

    if (store?.error) {
      if (typeof store.error === 'object' && store.error.name) {
        setCurrentError(store.error);
      } else {
        setCurrentError({ message: store.error, name: 'ToolsError' });
      }
    }
  }, [store.actionFlag, store.success, store.error, navigate, dispatch]);

  // ** Handlers
  const onSubmit = (data) => {
    if (!canAddTool) {
      setCurrentError({
        name: 'ToolsPermissionError',
        message: 'You do not have permission to create tools',
        action: 'create tool',
        userRole
      });
      return;
    }

    // Validate required fields
    if (!data.name?.trim()) {
      setCurrentError({
        name: 'ToolValidationError',
        field: 'name',
        value: data.name,
        reason: 'Tool name is required'
      });
      return;
    }

    // Combine form data with settings and schedules
    const completeData = {
      ...data,
      settings: toolSettings,
      schedules: toolSchedules
    };

    dispatch(createTool({ 
      data: completeData, 
      selectedCompany 
    }));
  };

  const handleCancel = () => {
    navigate(`${appsRoot}/tools`);
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
  };

  const handleSettingsChange = (settings) => {
    setToolSettings(settings);
  };

  const handleSchedulesChange = (schedules) => {
    setToolSchedules(schedules);
  };

  // ** Render
  if (!canAddTool) {
    return (
      <ToolsErrorAlert
        error={{
          name: 'ToolsPermissionError',
          message: 'You do not have permission to create tools',
          action: 'create tool',
          userRole
        }}
        userRole={userRole}
        onDismiss={() => navigate(`${appsRoot}/tools`)}
        showRetry={false}
      />
    );
  }

  return (
    <Fragment>
      <ToolsErrorBoundary 
        userRole={userRole}
        onRetry={() => reset()}
      >
        <Row>
          <Col sm="12">
            <Card>
              <CardHeader>
                <h4 className="mb-0">{t("Add New Tool")}</h4>
              </CardHeader>
              <CardBody>
                {/* Error Alert */}
                {currentError && (
                  <ToolsErrorAlert
                    error={currentError}
                    userRole={userRole}
                    onDismiss={() => setCurrentError(null)}
                    onRetry={() => {
                      setCurrentError(null);
                    }}
                  />
                )}

                {/* Company Context for Super Admin */}
                {isUserSuperAdmin && (
                  <Row className="mb-3">
                    <Col sm="12">
                      <div className="alert alert-info">
                        <strong>{t("Context:")}</strong>{" "}
                        {selectedCompany 
                          ? t("Creating tool for selected company")
                          : t("Creating tool in admin context")
                        }
                      </div>
                      
                      {/* Company Selection for Super Admin */}
                      {/* <div className="mb-2">
                        <Label className="form-label">
                          {t("Target Company")} <small className="text-muted">({t("Optional")})</small>
                        </Label>
                        <Input
                          type="select"
                          value={selectedCompany}
                          onChange={(e) => handleCompanyChange(e.target.value)}
                        >
                          <option value="">{t("Admin Level (All Companies)")}</option>
                          {store?.companiesItems?.map((company) => (
                            <option key={company.tenantId} value={company.tenantId}>
                              {company.company_name}
                            </option>
                          ))}
                        </Input>
                        <small className="text-muted">
                          {t("Select a company to create the tool for that specific tenant, or leave empty for admin-level tool")}
                        </small>
                      </div> */}
                    </Col>
                  </Row>
                )}

                <ToolTabbedInterface
                  toolId={null} // No ID for new tool
                  selectedCompany={selectedCompany}
                  onSettingsChange={handleSettingsChange}
                  onSchedulesChange={handleSchedulesChange}
                  initialSettings={toolSettings}
                  initialSchedules={toolSchedules}
                >
                  <Form onSubmit={handleSubmit(onSubmit)}>
                    <Row>
                      <Col sm="6">
                        <div className="mb-1">
                          <Label className="form-label" for="name">
                            {t("Tool Name")} <span className="text-danger">*</span>
                          </Label>
                          <Controller
                            name="name"
                            control={control}
                            rules={{ 
                              required: t("Tool name is required"),
                              minLength: {
                                value: 2,
                                message: t("Tool name must be at least 2 characters")
                              }
                            }}
                            render={({ field }) => (
                              <Input
                                {...field}
                                id="name"
                                placeholder={t("Enter tool name")}
                                invalid={errors.name && true}
                              />
                            )}
                          />
                          {errors.name && (
                            <FormFeedback>{errors.name.message}</FormFeedback>
                          )}
                        </div>
                      </Col>

                      <Col sm="6">
                        <div className="mb-1">
                          <Label className="form-label" for="status">
                            {t("Status")}
                          </Label>
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="select"
                                id="status"
                              >
                                <option value={1}>{t("Active")}</option>
                                <option value={2}>{t("Inactive")}</option>
                              </Input>
                            )}
                          />
                        </div>
                      </Col>

                      <Col sm="12">
                        <div className="mb-1">
                          <Label className="form-label" for="description">
                            {t("Description")}
                          </Label>
                          <Controller
                            name="description"
                            control={control}
                            rules={{
                              maxLength: {
                                value: 500,
                                message: t("Description cannot exceed 500 characters")
                              }
                            }}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="textarea"
                                id="description"
                                rows="3"
                                placeholder={t("Enter tool description")}
                                invalid={errors.description && true}
                              />
                            )}
                          />
                          {errors.description && (
                            <FormFeedback>{errors.description.message}</FormFeedback>
                          )}
                        </div>
                      </Col>

                      <Col sm="12">
                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            type="button"
                            color="secondary"
                            outline
                            onClick={handleCancel}
                          >
                            {t("Cancel")}
                          </Button>
                          <Button
                            type="submit"
                            color="primary"
                            disabled={store?.loading === false}
                          >
                            {store?.loading === false ? t("Creating...") : t("Create Tool")}
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </Form>
                </ToolTabbedInterface>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </ToolsErrorBoundary>
    </Fragment>
  );
};

export default ToolAdd;