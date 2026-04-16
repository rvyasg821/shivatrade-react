/* eslint-disable object-shorthand */
/* eslint-disable prefer-const */
// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getTool, createTool, updateTool, cleanToolsMessage } from "../store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
    Row,
    Form,
    Card,
    Label,
    Input,
    Button,
    Spinner,
    CardBody,
    FormFeedback,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import Notification from "@components/toast/notification";
import ToolsErrorBoundary from "./ToolsErrorBoundary";
import ToolsErrorAlert from "./ToolsErrorAlert";
import ToolTabbedInterface from "./ToolTabbedInterface";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Role-based utilities
import {
    getUserRole,
    isSuperAdmin,
    hasToolsPermission,
} from "../utils/roleUtils";

// ** Error utilities
import { getErrorMessage } from "../errors/ToolsErrors";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import {
    appsRoot,
    ENUM_TOOLS_STATUS,
} from "@constant/defaultValues";

const ToolForm = () => {
    // ** Hooks
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ** Store vars
    const dispatch = useDispatch();
    const store = useSelector((state) => state.tools);
    const authStore = useSelector((state) => state.auth);
console.log(authStore)
    // ** Role-based variables
    const userRole = getUserRole(authStore);
    const isUserSuperAdmin = isSuperAdmin(userRole);
    const isSystemUsers = authStore?.authUserItem?.isSystemUser;

    // const showCompanyFilter = shouldShowCompanyFilter(userRole);
    const canAddTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_add');
    const canUpdateTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_update');
    const isReadOnly = userRole?.name === 'Company Admin' || !isSystemUsers;

    // ** States
    const [resetValue, setResetValue] = useState(false);
    const [currentError, setCurrentError] = useState(null);
    const [toolSettings, setToolSettings] = useState([]);
    const [toolSchedules, setToolSchedules] = useState([]);
    const [tenantToolId, setTenantToolId] = useState(null);

    // ** Get selected company from Redux (persistent across navigation)
    const selectedCompany = store?.selectedCompany || "";

    // ** Constants
    const isEditMode = !!id;

    /* Yup validation schema */
    const ToolSchema = yup.object().shape({
        name: yup
            .string()
            .required(`${t("Tool name is required")}.`)
            .min(3, `${t("Name must be at least 3 characters")}.`)
            .max(100, `${t("Name must be at most 100 characters")}.`)
            .trim(),
        description: yup
            .string()
            .required(`${t("Description is required")}.`)
            .min(10, `${t("Description must be at least 10 characters")}.`)
            .max(500, `${t("Description must be at most 500 characters")}.`)
            .trim(),
        status: yup
            .number()
            .required(`${t("Status is required")}.`)
            .oneOf(Object.keys(ENUM_TOOLS_STATUS).map(Number), `${t("Invalid status")}.`),
    });

    const {
        reset,
        control,
        setValue,
        handleSubmit,
        watch,
        formState: { errors, isValid, isDirty },
    } = useForm({
        mode: "all",
        defaultValues: {
            name: "",
            description: "",
            status: 1,
        },
        resolver: yupResolver(ToolSchema),
        shouldFocusError: false,
    });
    const watchedValues = watch();

    // Log validation errors whenever they change
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            Object.keys(errors).forEach(field => {
                console.log(`Field "${field}" error:`, errors[field]);
            });
        }
    }, [errors, isValid, isDirty, watchedValues]);

    useLayoutEffect(() => {
        if (isEditMode) {
            dispatch(getTool({ id, selectedCompany }));
        }

    }, [id, isUserSuperAdmin, searchParams]);

    useEffect(() => {
        /* For blank message api called inside */
        if (store?.actionFlag || store?.success || store?.error) {
            dispatch(cleanToolsMessage(null));
        }

        if (store?.actionFlag === "TOOL_CRTD" || store?.actionFlag === "TOOL_UPDT") {
            navigate(`${appsRoot}/tools`);
        }

        if ((store?.actionFlag === "TOOL_SCS" && store?.toolItem) || resetValue) {
            let toolItem = { ...store.toolItem };

            // Ensure we have the required fields for the form
            const formData = {
                _id: toolItem._id || "",
                name: toolItem.name || "",
                description: toolItem.description || "",
                status: toolItem.status || 1
            };
            // Populate settings and schedules if they exist
            setToolSettings(toolItem.settings || []);
            setToolSchedules(toolItem.schedules || []);

            reset(formData);
            setResetValue(() => false);
        }

        /* Success toast notification */
        if (store?.success) {
            // Notification("Success", store.success, "success");
        }

        /* Error toast notification */
        if (store?.error) {
            if (typeof store.error === 'object' && store.error.name) {
                setCurrentError(store.error);
                const userFriendlyMessage = getErrorMessage(store.error, t);
                Notification("Error", userFriendlyMessage, "warning");
            } else {
                setCurrentError({ message: store.error, name: 'ToolsError' });
                Notification("Error", store.error, "warning");
            }
        }

        /* Clear error on success */
        if (store?.success) {
            setCurrentError(null);
        }
    }, [store.actionFlag, store.success, store.error]);

    // Separate effect for form population to ensure it works reliably
    useEffect(() => {
        if (isEditMode && store?.toolItem && store.toolItem._id) {
            const formData = {
                _id: store.toolItem._id || "",
                name: store.toolItem.name || "",
                description: store.toolItem.description || "",
                status: store.toolItem.status || 1
            };
            // Use a small timeout to ensure the form is ready
            setTimeout(() => {
                // Use setValue for individual fields to ensure they're set
                setValue("name", formData.name);
                setValue("description", formData.description);
                setValue("status", formData.status);

                // Populate settings and schedules
                setToolSettings(store.toolItem.settings || []);
                setToolSchedules(store.toolItem.schedules || []);

                // Set tenant tool ID if available (for tenant-specific operations)
                if (store.toolItem.tenantToolId) {
                    setTenantToolId(store.toolItem.tenantToolId);
                } else if (store.toolItem._id) {
                    // For company admin: always use tool ID as tenant tool ID
                    // For super admin: use tool ID when company is selected
                    if (!isUserSuperAdmin || selectedCompany) {
                        setTenantToolId(store.toolItem._id);
                    }
                }

                // Also try reset as backup
                reset(formData);
            }, 100);
        }
    }, [store.toolItem, isEditMode, setValue, reset, watch, selectedCompany]);

    const handleCancel = () => {
        // Reset the form to its initial values
        reset({
            name: "",
            description: "",
            status: 1,
        });
        navigate(`${appsRoot}/tools`);
    };

    const handleSettingsChange = (settings) => {
        setToolSettings(settings);
    };

    const handleSchedulesChange = (schedules) => {
        setToolSchedules(schedules);
    };

    const onSubmit = (values) => {
        // Check permissions
        const hasPermission = isEditMode ? canUpdateTool : canAddTool;
        if (!hasPermission) {
            setCurrentError({
                name: 'ToolsPermissionError',
                message: `You do not have permission to ${isEditMode ? 'update' : 'create'} tools`,
                action: isEditMode ? 'update tool' : 'create tool',
                userRole
            });
            return;
        }

        if (values) {
            const toolData = {
                name: values?.name || "",
                description: values?.description || "",
                status: parseInt(values?.status) || 1,
                settings: toolSettings,
                schedules: toolSchedules
            };

            // Add tenant-specific data if applicable
            if (tenantToolId) {
                toolData.tenantId = selectedCompany;
                toolData.tenantToolId = tenantToolId;
            }

            // Validate tenant data consistency if in tenant mode
            if (selectedCompany && isEditMode) {
                if (!tenantToolId) {
                    setCurrentError({
                        name: 'TenantValidationError',
                        message: 'Missing tenant tool ID for tenant-specific operations',
                        action: 'validate tenant data'
                    });
                    return;
                }
            }

            if (isEditMode && values?._id) {
                dispatch(updateTool({ id: values._id, data: toolData }));
            } else {
                dispatch(createTool({ data: toolData, selectedCompany }));
            }
        } else {
            console.error("No form values received!");
        }
    };

    useEffect(() => {
        if (!store?.loading) {
            dispatch(startLoading());
        } else {
            dispatch(stopLoading());
        }
    }, [store?.loading]);

    return (
        <Fragment>
            <ToolsErrorBoundary
                userRole={userRole}
                onRetry={() => {
                    if (isEditMode) {
                        dispatch(getTool({ id, selectedCompany }));
                    }
                }}
            >
                <div className="main-content">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <h3 className="mb-0">{isEditMode ? t("Edit Tool") : t("Add Tool")}</h3>

                        <Button
                            type="button"
                            className="ms-2 btn-primary"
                            onClick={() => navigate(`${appsRoot}/tools`)}
                        >
                            <ArrowLeft size={17} />
                        </Button>
                    </div>

                    {/* Error Alert */}
                    {currentError && (
                        <ToolsErrorAlert
                            error={currentError}
                            userRole={userRole}
                            onDismiss={() => setCurrentError(null)}
                            onRetry={() => {
                                setCurrentError(null);
                                if (isEditMode) {
                                    dispatch(getTool({ id, selectedCompany }));
                                }
                            }}
                        />
                    )}

                    <Row>
                        <ToolTabbedInterface
                            toolId={id}
                            selectedCompany={selectedCompany}
                            tenantToolId={tenantToolId}
                            onSettingsChange={handleSettingsChange}
                            onSchedulesChange={handleSchedulesChange}
                            initialSettings={toolSettings}
                            initialSchedules={toolSchedules}
                        >

                            <Form
                                className="mt-0"
                                autoComplete="off"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <Card>
                                    <CardBody>
                                        <Row>
                                            {/* Tool Name */}
                                            <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                                <Label className="form-label" for="name">
                                                    {t("Tool Name")} <span className="text-danger">*</span>
                                                </Label>
                                                <Controller
                                                    id="name"
                                                    name="name"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            {...field}
                                                            readOnly={isReadOnly}
                                                            disabled={isReadOnly}
                                                            className=""
                                                            autoComplete="off"
                                                            invalid={errors.name && true}
                                                            placeholder={t("Enter tool name")}
                                                        />
                                                    )}
                                                />
                                                <FormFeedback>{errors.name?.message}</FormFeedback>
                                            </div>


                                            {/* Status */}
                                            <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                                <Label className="form-label" for="status">
                                                    {t("Status")} <span className="text-danger">*</span>
                                                </Label>
                                                <Controller
                                                    id="status"
                                                    name="status"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Row className="px-1 status">
                                                            <div
                                                                className="form-check"
                                                                style={{ width: "max-content" }}
                                                            >
                                                                <Input
                                                                    {...field}
                                                                    readOnly={isReadOnly}
                                                                    disabled={isReadOnly}
                                                                    id="status_active"
                                                                    type="radio"
                                                                    value={1}
                                                                    checked={field?.value === 1}
                                                                    onChange={() => field.onChange(1)}
                                                                />
                                                                <Label className="form-check-label" for="status_active">
                                                                    {t("Active")}
                                                                </Label>
                                                            </div>

                                                            <div
                                                                className="form-check"
                                                                style={{ width: "max-content" }}
                                                            >
                                                                <Input
                                                                    {...field}
                                                                    readOnly={isReadOnly}
                                                                    disabled={isReadOnly}
                                                                    id="status_inactive"
                                                                    type="radio"
                                                                    value={2}
                                                                    checked={field?.value === 2}
                                                                    onChange={() => field.onChange(2)}
                                                                />
                                                                <Label className="form-check-label" for="status_inactive">
                                                                    {t("Inactive")}
                                                                </Label>
                                                            </div>
                                                        </Row>
                                                    )}
                                                />
                                                <FormFeedback className="d-block">
                                                    {errors.status?.message}
                                                </FormFeedback>
                                            </div>
                                        </Row>

                                        {/* Description - Full Width */}
                                        <Row>
                                            <div className="mb-2 col-12 ">
                                                <Label className="form-label" for="description">
                                                    {t("Description")} <span className="text-danger">*</span>
                                                </Label>
                                                <Controller
                                                    id="description"
                                                    name="description"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            {...field}
                                                            readOnly={isReadOnly}
                                                            disabled={isReadOnly}
                                                            type="textarea"
                                                            rows="4"
                                                            className=""
                                                            autoComplete="off"
                                                            invalid={errors.description && true}
                                                            placeholder={t("Enter tool description")}
                                                        />
                                                    )}
                                                />
                                                <FormFeedback>{errors.description?.message}</FormFeedback>
                                            </div>
                                        </Row>

                                      {!isReadOnly && isSystemUsers && (
                                            <div className="main-form-btn">
                                              
                                                <div className="form-btn mt-2">
                                                    <Button
                                                        type="submit"
                                                        color="primary"
                                                        disabled={!store.loading}
                                                    >
                                                        {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm" />)}
                                                    </Button>
                                                </div>
                                               

                                                <div className="form-btn mt-2">
                                                    <Button
                                                        type="button"
                                                        color="secondary"
                                                        disabled={!store.loading}
                                                        onClick={handleCancel}
                                                    >
                                                        {t("Cancel")}
                                                    </Button>
                                                </div>
                                            </div>
                                             )}
                                        
                                    </CardBody>
                                </Card>
                            </Form>
                        </ToolTabbedInterface>
                    </Row>
                </div>
            </ToolsErrorBoundary>
        </Fragment>
    );
};

export default ToolForm;