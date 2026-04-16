// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getToolSchedule, createToolSchedule, updateToolSchedule, cleanToolSchedulesMessage } from "../store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
    Row,
    Col,
    Form,
    Card,
    Label,
    Input,
    Button,
    Spinner,
    CardBody,
    FormFeedback,
    TabContent,
    TabPane,
    Nav,
    NavItem,
    NavLink,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import {
    appsRoot,
    ENUM_TOOL_SCHEDULE_STATUS,
} from "@constant/defaultValues";

const ToolScheduleForm = () => {
    // ** Hooks
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ** Store vars
    const dispatch = useDispatch();
    const store = useSelector((state) => state.toolSchedules);

    // ** States
    const [resetValue, setResetValue] = useState(false);
    const [activeTab, setActiveTab] = useState("1"); // 1 = Manual, 2 = Builder
    const [cronBuilder, setCronBuilder] = useState({
        minute: "0",
        hour: "9",
        day: "*",
        month: "*",
        dayOfWeek: "*",
        period: "daily", // daily, weekly, monthly, yearly
        yearType: "date" // date, weekday
    });

    // ** Constants
    const isEditMode = !!id;

    // ** Cron Builder Utility Functions
    const generateCronFromBuilder = (builder) => {
        const { minute, hour, day, month, dayOfWeek, period, yearType } = builder;

        switch (period) {
            case "minutely":
                return `${minute} * * * *`;
            case "hourly":
                return `0 * * * *`;
            case "daily":
                return `${minute} ${hour} * * *`;
            case "weekly":
                return `${minute} ${hour} * * ${dayOfWeek}`;
            case "monthly":
                return `${minute} ${hour} ${day} * *`;
            case "yearly":
                if (yearType === "date") {
                    return `${minute} ${hour} ${day} ${month} *`;
                } else {
                    // For yearly weekday: minute hour day month weekday
                    // Example: "0 9 * 3 1" = First Monday of March every year
                    return `${minute} ${hour} * ${month} ${dayOfWeek}`;
                }
            default:
                return `${minute} ${hour} * * *`;
        }
    };

    const parseCronToBuilder = (cronString) => {
        if (!cronString || cronString === "* * * * *") {
            return {
                minute: "0",
                hour: "9",
                day: "*",
                month: "*",
                dayOfWeek: "*",
                period: "daily"
            };
        }

        const parts = cronString.split(" ");
        if (parts.length !== 5) return null;

        const [minute, hour, day, month, dayOfWeek] = parts;

        // Determine period based on cron pattern
        let period = "daily";
        let yearType = "date";

        if (day !== "*" && month !== "*") {
            period = "yearly";
            // Check if it's a weekday-based yearly schedule
            if (dayOfWeek !== "*") {
                yearType = "weekday";
            }
        } else if (day !== "*") {
            period = "monthly";
        } else if (dayOfWeek !== "*") {
            period = "weekly";
        } else if (hour === "*") {
            period = "minutely";
        } else if (minute === "0" && hour !== "*") {
            period = "daily";
        }

        return {
            minute: minute === "*" ? "0" : minute,
            hour: hour === "*" ? "9" : hour,
            day: day === "*" ? "1" : day,
            month: month === "*" ? "1" : month,
            dayOfWeek: dayOfWeek === "*" ? "1" : dayOfWeek,
            period,
            yearType
        };
    };

    const updateCronFromBuilder = (newBuilder) => {
        const cronExpression = generateCronFromBuilder(newBuilder);
        setValue("cronString", cronExpression, { shouldValidate: true, shouldDirty: true });
        setCronBuilder(newBuilder);
    };

    /* Yup validation schema */
    const ToolScheduleSchema = yup.object().shape({
        name: yup
            .string()
            .required(`${t("Name is required")}.`)
            .min(3, `${t("Name must be at least 3 characters")}.`)
            .max(100, `${t("Name must be at most 100 characters")}.`)
            .trim(),
        slug: yup
            .string()
            .required(`${t("Slug is required")}.`)
            .min(3, `${t("Slug must be at least 3 characters")}.`)
            .max(100, `${t("Slug must be at most 100 characters")}.`)
            .matches(/^[a-z0-9-]+$/, `${t("Slug can only contain lowercase letters, numbers, and hyphens")}.`)
            .trim(),
        cronString: yup
            .string()
            .required(`${t("Cron expression is required")}.`)
            .min(5, `${t("Cron expression must be at least 5 characters")}.`)
            .max(100, `${t("Cron expression must be at most 100 characters")}.`)
            .matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, `${t("Please enter a valid cron expression")}.`)
            .trim(),
        status: yup
            .number()
            .required(`${t("Status is required")}.`)
            .oneOf([1, 2], `${t("Invalid status")}.`),
        description: yup
            .string()
            .required(`${t("Description is required")}.`)
            .min(10, `${t("Description must be at least 10 characters")}.`)
            .max(500, `${t("Description must be at most 500 characters")}.`)
            .trim(),
        tenantToolId: yup
            .string()
            .required(`${t("Tenant tool selection is required")}.`)
            .min(1, `${t("Please select a tenant tool")}.`)
            .trim(),
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
            slug: "",
            cronString: "",
            status: 1,
            description: "",
            tenantToolId: "",
        },
        resolver: yupResolver(ToolScheduleSchema),
        shouldFocusError: false,
    });


    // Log validation errors whenever they change
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            console.log("=== TOOL SCHEDULE FORM VALIDATION ERRORS ===");
            console.log("Validation errors:", errors);
            console.log("Is form valid:", isValid);
            console.log("Is form dirty:", isDirty);

            // Log specific error details
            Object.keys(errors).forEach(field => {
                console.log(`Field "${field}" error:`, errors[field]);
            });
        }
    }, [errors, isValid, isDirty]);

    useLayoutEffect(() => {
        console.log("=== TOOL SCHEDULE COMPONENT INITIALIZATION ===");
        console.log("Is edit mode:", isEditMode);
        console.log("Schedule ID:", id);

        if (isEditMode) {
            console.log("Loading tool schedule data for ID:", id);
            dispatch(getToolSchedule(id));
        }
    }, [id]);

    // Watch form values for debugging
    const watchedValues = watch();
    useEffect(() => {
        if (Object.keys(watchedValues).length > 0) {
            console.log("=== TOOL SCHEDULE FORM VALUES CHANGED ===");
            console.log("Current form values:", watchedValues);
        }
    }, [watchedValues]);

    // Auto-generate slug from name
    const watchedName = watch("name");
    useEffect(() => {
        if (watchedName && watchedName.trim()) {
            const generatedSlug = watchedName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
                .trim();

            // Only update if the generated slug is different from current slug
            const currentSlug = watch("slug");
            if (generatedSlug && generatedSlug !== currentSlug) {
                setValue("slug", generatedSlug, { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [watchedName, setValue, watch]);

    // Sync cron builder with manual cron string
    const watchedCronString = watch("cronString");
    useEffect(() => {
        if (watchedCronString && activeTab === "1") {
            const parsed = parseCronToBuilder(watchedCronString);
            if (parsed) {
                setCronBuilder(parsed);
            }
        }
    }, [watchedCronString, activeTab]);

    // Parse existing cron string when editing
    useEffect(() => {
        if (isEditMode && store?.toolScheduleItem?.cronString) {
            const parsed = parseCronToBuilder(store.toolScheduleItem.cronString);
            if (parsed) {
                setCronBuilder(parsed);
            }
        }
    }, [isEditMode, store?.toolScheduleItem?.cronString]);

    useEffect(() => {
        console.log("=== TOOL SCHEDULE REDUX STORE UPDATE ===");
        console.log("Store state:", {
            actionFlag: store?.actionFlag,
            success: store?.success,
            error: store?.error,
            loading: store?.loading,
            toolScheduleItem: store?.toolScheduleItem
        });

        /* For blank message api called inside */
        if (store?.actionFlag || store?.success || store?.error) {
            dispatch(cleanToolSchedulesMessage(null));
        }

        if (store?.actionFlag === "TOOL_SCHEDULE_CRTD" || store?.actionFlag === "TOOL_SCHEDULE_UPDT") {
            console.log("Tool schedule operation successful, navigating to tool schedule list");
            navigate(`${appsRoot}/tool-schedule`);
        }

        if ((store?.actionFlag === "TOOL_SCHEDULE_SCS" && store?.toolScheduleItem) || resetValue) {
            console.log("Loading tool schedule data for edit mode:", store?.toolScheduleItem);
            let toolScheduleItem = { ...store.toolScheduleItem };

            console.log("Resetting form with tool schedule data:", toolScheduleItem);
            reset({ ...toolScheduleItem });
            setResetValue(() => false);
        }

        /* Success toast notification */
        if (store?.success) {
            Notification("Success", store.success, "success");
        }

        /* Error toast notification */
        if (store?.error) {
            Notification("Error", store.error, "warning");
        }
    }, [store.actionFlag, store.success, store.error]);

    const handleCancel = () => {
        // Reset the form to its initial values
        reset({
            name: "",
            slug: "",
            cronString: "",
            status: 1,
            description: "",
            tenantToolId: "",
        });
        navigate(`${appsRoot}/tool-schedule`);
    };



    const onSubmit = (values) => {
        console.log("=== TOOL SCHEDULE FORM SUBMISSION DEBUG ===");
        console.log("Form values received:", values);
        console.log("Form errors:", errors);
        console.log("Is edit mode:", isEditMode);

        if (values) {
            const toolScheduleData = {
                name: values?.name || "",
                slug: values?.slug || "",
                cronString: values?.cronString || "",
                status: parseInt(values?.status) || 1,
                description: values?.description || "",
                tenantToolId: values?.tenantToolId || "",
            };

            console.log("Processed tool schedule data:", toolScheduleData);

            if (isEditMode && values?._id) {
                console.log("Dispatching updateToolSchedule with ID:", values._id);
                dispatch(updateToolSchedule({ id: values._id, data: toolScheduleData }));
            } else {
                console.log("Dispatching createToolSchedule");
                dispatch(createToolSchedule(toolScheduleData));
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
            <div className="main-content">
                <div className="d-flex align-items-center justify-content-between mb-1">
                    <h3 className="mb-0">{isEditMode ? t("Edit Tool Schedule") : t("Add Tool Schedule")}</h3>

                    <Button
                        type="button"
                        className="ms-2 btn-primary"
                        onClick={() => navigate(`${appsRoot}/tool-schedule`)}
                    >
                        <ArrowLeft size={17} />
                    </Button>
                </div>

                <Card>
                    <CardBody className={"p-2"}>
                        <Row>
                            <Form
                                className=""
                                autoComplete="off"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <Row>
                                    {/* Name */}
                                    <div className="mb-3 col-lg-6 col-md-6 col-sm-6">
                                        <Label className="form-label" for="name">
                                            {t("Name")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="name"
                                            name="name"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    autoComplete="off"
                                                    invalid={errors.name && true}
                                                    placeholder={t("Enter schedule name")}
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.name?.message}</FormFeedback>
                                    </div>

                                    {/* Slug */}
                                    <div className="mb-3 col-lg-6 col-md-6 col-sm-6">
                                        <Label className="form-label" for="slug">
                                            {t("Slug")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="slug"
                                            name="slug"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    autoComplete="off"
                                                    invalid={errors.slug && true}
                                                    placeholder={t("Auto-generated")}
                                                    disabled
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.slug?.message}</FormFeedback>
                                        <small className="text-muted">
                                            {t("Auto-generated from name")}
                                        </small>
                                    </div>
                                </Row>

                                <Row>
                                    {/* Cron Expression with Builder */}
                                    <div className="col-12 mb-3">
                                        <Label className="form-label" for="cronString">
                                            {t("Cron Expression")} <span className="text-danger">*</span>
                                        </Label>

                                        <Nav tabs className="mb-3">
                                            <NavItem>
                                                <NavLink
                                                    className={activeTab === "1" ? "active" : ""}
                                                    onClick={() => setActiveTab("1")}
                                                >
                                                    {t("Manual")}
                                                </NavLink>
                                            </NavItem>
                                            <NavItem>
                                                <NavLink
                                                    className={activeTab === "2" ? "active" : ""}
                                                    onClick={() => setActiveTab("2")}
                                                >
                                                    {t("Builder")}
                                                </NavLink>
                                            </NavItem>
                                        </Nav>

                                        <TabContent activeTab={activeTab}>
                                            <TabPane tabId="1">
                                                <Controller
                                                    id="cronString"
                                                    name="cronString"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            {...field}
                                                            className=""
                                                            autoComplete="off"
                                                            invalid={errors.cronString && true}
                                                            placeholder={t("Enter cron expression (e.g., 0 9 * * *)")}
                                                        />
                                                    )}
                                                />
                                                <FormFeedback>{errors.cronString?.message}</FormFeedback>
                                                <small className="text-muted">
                                                    {t("Format: minute hour day month weekday (0 9 * * * = daily at 9 AM)")}
                                                </small>
                                            </TabPane>

                                            <TabPane tabId="2">
                                                <div className="cron-builder p-3 border rounded bg-light">
                                                    <Row className="mb-3">
                                                        <Col md={6}>
                                                            <Label className="form-label">{t("Frequency")}</Label>
                                                            <Input
                                                                type="select"
                                                                value={cronBuilder.period}
                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, period: e.target.value})}
                                                            >
                                                                <option value="minutely">{t("Every Minute")}</option>
                                                                <option value="hourly">{t("Every Hour")}</option>
                                                                <option value="daily">{t("Every Day")}</option>
                                                                <option value="weekly">{t("Every Week")}</option>
                                                                <option value="monthly">{t("Every Month")}</option>
                                                                <option value="yearly">{t("Every Year")}</option>
                                                            </Input>
                                                        </Col>

                                                        {cronBuilder.period === "daily" && (
                                                            <Col md={6}>
                                                                <Label className="form-label">{t("Time")}</Label>
                                                                <Row>
                                                                    <Col md={6}>
                                                                        <Input
                                                                            type="select"
                                                                            value={cronBuilder.hour}
                                                                            onChange={(e) => updateCronFromBuilder({...cronBuilder, hour: e.target.value})}
                                                                        >
                                                                            {Array.from({length: 24}, (_, i) => (
                                                                                <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</option>
                                                                            ))}
                                                                        </Input>
                                                                    </Col>
                                                                    <Col md={6}>
                                                                        <Input
                                                                            type="select"
                                                                            value={cronBuilder.minute}
                                                                            onChange={(e) => updateCronFromBuilder({...cronBuilder, minute: e.target.value})}
                                                                        >
                                                                            <option value="0">00</option>
                                                                            <option value="15">15</option>
                                                                            <option value="30">30</option>
                                                                            <option value="45">45</option>
                                                                        </Input>
                                                                    </Col>
                                                                </Row>
                                                            </Col>
                                                        )}

                                                        {cronBuilder.period === "weekly" && (
                                                            <>
                                                                <Col md={3}>
                                                                    <Label className="form-label mb-1">{t("Time")}</Label>
                                                                    <Row className="gx-1">
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                className="form-select-sm"
                                                                                value={cronBuilder.hour}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, hour: e.target.value})}
                                                                            >
                                                                                {Array.from({length: 24}, (_, i) => (
                                                                                    <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</option>
                                                                                ))}
                                                                            </Input>
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                className="form-select-sm"
                                                                                value={cronBuilder.minute}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, minute: e.target.value})}
                                                                            >
                                                                                <option value="0">00</option>
                                                                                <option value="15">15</option>
                                                                                <option value="30">30</option>
                                                                                <option value="45">45</option>
                                                                            </Input>
                                                                        </Col>
                                                                    </Row>
                                                                </Col>
                                                                <Col md={3}>
                                                                    <Label className="form-label mb-1">{t("Day")}</Label>
                                                                    <Input
                                                                        type="select"
                                                                        className="form-select-sm"
                                                                        value={cronBuilder.dayOfWeek}
                                                                        onChange={(e) => updateCronFromBuilder({...cronBuilder, dayOfWeek: e.target.value})}
                                                                    >
                                                                        <option value="0">{t("Sun")}</option>
                                                                        <option value="1">{t("Mon")}</option>
                                                                        <option value="2">{t("Tue")}</option>
                                                                        <option value="3">{t("Wed")}</option>
                                                                        <option value="4">{t("Thu")}</option>
                                                                        <option value="5">{t("Fri")}</option>
                                                                        <option value="6">{t("Sat")}</option>
                                                                    </Input>
                                                                </Col>
                                                            </>
                                                        )}

                                                        {cronBuilder.period === "monthly" && (
                                                            <>
                                                                <Col md={3}>
                                                                    <Label className="form-label mb-1">{t("Time")}</Label>
                                                                    <Row className="gx-1">
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                className="form-select-sm"
                                                                                value={cronBuilder.hour}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, hour: e.target.value})}
                                                                            >
                                                                                {Array.from({length: 24}, (_, i) => (
                                                                                    <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</option>
                                                                                ))}
                                                                            </Input>
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                className="form-select-sm"
                                                                                value={cronBuilder.minute}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, minute: e.target.value})}
                                                                            >
                                                                                <option value="0">00</option>
                                                                                <option value="15">15</option>
                                                                                <option value="30">30</option>
                                                                                <option value="45">45</option>
                                                                            </Input>
                                                                        </Col>
                                                                    </Row>
                                                                </Col>
                                                                <Col md={3}>
                                                                    <Label className="form-label mb-1">{t("Day")}</Label>
                                                                    <Input
                                                                        type="select"
                                                                        className="form-select-sm"
                                                                        value={cronBuilder.day}
                                                                        onChange={(e) => updateCronFromBuilder({...cronBuilder, day: e.target.value})}
                                                                    >
                                                                        {Array.from({length: 31}, (_, i) => (
                                                                            <option key={i+1} value={(i+1).toString()}>{i+1}</option>
                                                                        ))}
                                                                    </Input>
                                                                </Col>
                                                            </>
                                                        )}

                                                        {cronBuilder.period === "yearly" && (
                                                            <>
                                                                <Col md={3}>
                                                                    <Label className="form-label">{t("Time")}</Label>
                                                                    <Row>
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                value={cronBuilder.hour}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, hour: e.target.value})}
                                                                            >
                                                                                {Array.from({length: 24}, (_, i) => (
                                                                                    <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</option>
                                                                                ))}
                                                                            </Input>
                                                                        </Col>
                                                                        <Col md={6}>
                                                                            <Input
                                                                                type="select"
                                                                                value={cronBuilder.minute}
                                                                                onChange={(e) => updateCronFromBuilder({...cronBuilder, minute: e.target.value})}
                                                                            >
                                                                                <option value="0">00</option>
                                                                                <option value="15">15</option>
                                                                                <option value="30">30</option>
                                                                                <option value="45">45</option>
                                                                            </Input>
                                                                        </Col>
                                                                    </Row>
                                                                </Col>

                                                                <Col md={3}>
                                                                    <Label className="form-label">{t("Month")}</Label>
                                                                    <Input
                                                                        type="select"
                                                                        value={cronBuilder.month}
                                                                        onChange={(e) => updateCronFromBuilder({...cronBuilder, month: e.target.value})}
                                                                    >
                                                                        <option value="1">{t("January")}</option>
                                                                        <option value="2">{t("February")}</option>
                                                                        <option value="3">{t("March")}</option>
                                                                        <option value="4">{t("April")}</option>
                                                                        <option value="5">{t("May")}</option>
                                                                        <option value="6">{t("June")}</option>
                                                                        <option value="7">{t("July")}</option>
                                                                        <option value="8">{t("August")}</option>
                                                                        <option value="9">{t("September")}</option>
                                                                        <option value="10">{t("October")}</option>
                                                                        <option value="11">{t("November")}</option>
                                                                        <option value="12">{t("December")}</option>
                                                                    </Input>
                                                                </Col>

                                                                <Col md={3}>
                                                                    <Label className="form-label">{t("Type")}</Label>
                                                                    <Input
                                                                        type="select"
                                                                        value={cronBuilder.yearType}
                                                                        onChange={(e) => updateCronFromBuilder({...cronBuilder, yearType: e.target.value})}
                                                                    >
                                                                        <option value="date">{t("On Date")}</option>
                                                                        <option value="weekday">{t("On Weekday")}</option>
                                                                    </Input>
                                                                </Col>

                                                                {cronBuilder.yearType === "date" ? (
                                                                    <Col md={3}>
                                                                        <Label className="form-label">{t("Day of Month")}</Label>
                                                                        <Input
                                                                            type="select"
                                                                            value={cronBuilder.day}
                                                                            onChange={(e) => updateCronFromBuilder({...cronBuilder, day: e.target.value})}
                                                                        >
                                                                            {Array.from({length: 31}, (_, i) => (
                                                                                <option key={i+1} value={(i+1).toString()}>{i+1}</option>
                                                                            ))}
                                                                        </Input>
                                                                    </Col>
                                                                ) : (
                                                                    <Col md={3}>
                                                                        <Label className="form-label">{t("Day of Week")}</Label>
                                                                        <Input
                                                                            type="select"
                                                                            value={cronBuilder.dayOfWeek}
                                                                            onChange={(e) => updateCronFromBuilder({...cronBuilder, dayOfWeek: e.target.value})}
                                                                        >
                                                                            <option value="0">{t("Sunday")}</option>
                                                                            <option value="1">{t("Monday")}</option>
                                                                            <option value="2">{t("Tuesday")}</option>
                                                                            <option value="3">{t("Wednesday")}</option>
                                                                            <option value="4">{t("Thursday")}</option>
                                                                            <option value="5">{t("Friday")}</option>
                                                                            <option value="6">{t("Saturday")}</option>
                                                                        </Input>
                                                                    </Col>
                                                                )}
                                                            </>
                                                        )}
                                                    </Row>

                                                    <Row className="mt-2">
                                                        <Col md={12}>
                                                            <div className="cron-preview p-1 bg-light rounded d-flex align-items-center">
                                                                <small className="text-muted me-2">{t("Preview")}:</small>
                                                                <code className="text-primary">{generateCronFromBuilder(cronBuilder)}</code>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </TabPane>
                                        </TabContent>
                                    </div>

                                    {/* Status */}
                                    <div className="mb-3 col-lg-6 col-md-6 col-sm-6">
                                        <Label className="form-label" for="status">
                                            {t("Status")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="status"
                                            name="status"
                                            control={control}
                                            render={({ field }) => (
                                                <div className="d-flex gap-4">
                                                    <div className="form-check">
                                                        <Input
                                                            {...field}
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
                                                    <div className="form-check">
                                                        <Input
                                                            {...field}
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
                                                </div>
                                            )}
                                        />
                                        <FormFeedback>
                                            {errors.status?.message}
                                        </FormFeedback>
                                    </div>
                                </Row>

                                <Row>
                                    {/* Description */}
                                    <div className="mb-3 col-lg-6 col-md-6 col-sm-6">
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
                                                    type="textarea"
                                                    rows="4"
                                                    autoComplete="off"
                                                    invalid={errors.description && true}
                                                    placeholder={t("Enter schedule description")}
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.description?.message}</FormFeedback>
                                    </div>

                                    {/* Tenant Tool Selection */}
                                    <div className="mb-3 col-lg-6 col-md-6 col-sm-6">
                                        <Label className="form-label" for="tenantToolId">
                                            {t("Tenant Tool")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="tenantToolId"
                                            name="tenantToolId"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="select"
                                                    autoComplete="off"
                                                    invalid={errors.tenantToolId && true}
                                                >
                                                    <option value="">{t("Select a tenant tool")}</option>
                                                    <option value="68ef4965ec9df9353b8140d6">Wazuh Security Tool</option>
                                                </Input>
                                            )}
                                        />
                                        <FormFeedback>{errors.tenantToolId?.message}</FormFeedback>
                                    </div>
                                </Row>


                                <div className="d-flex gap-3 mt-4">
                                    <Button
                                        type="submit"
                                        color="primary"
                                        disabled={!store.loading}
                                    >
                                        {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm" />)}
                                    </Button>

                                    <Button
                                        type="button"
                                        color="secondary"
                                        disabled={!store.loading}
                                        onClick={handleCancel}
                                    >
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </Form>
                        </Row>
                    </CardBody>
                </Card>
            </div>
        </Fragment>
    );
};

export default ToolScheduleForm;