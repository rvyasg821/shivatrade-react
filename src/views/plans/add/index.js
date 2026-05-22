// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getPlan, createPlan, updatePlan, cleanPlanMessage, cleanPlanState, getToolsList } from "../store";
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

// ** React Dropdown Import
import Select from "react-select";

// ** Custom Components
import Notification from "@components/toast/notification";
import ToolsSelector from "../components/ToolsSelector";
import FeaturesManager from "../components/FeaturesManager";
import LocationPricingManager from "../components/LocationPricingManager";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import {
    appsRoot,
    DURATION_TYPE_OPTIONS,
} from "@constant/defaultValues";
import { initPlanItem } from "@constant/reduxConstant";

const PlanForm = () => {
    // ** Hooks
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ** Store vars
    const dispatch = useDispatch();
    const store = useSelector((state) => state.plan);

    // ** States

    // ** Constants
    const isEditMode = !!id;

    /* Yup validation schema */
    const PlanSchema = yup.object().shape({
        name: yup.string().required(`${t("Plan name is required")}.`),
        duration_type: yup.string().required(`${t("Duration type is required")}.`),
        duration: yup.number()
            .when('duration_type', {
                is: (val) => val === 'LIFETIME',
                then: (schema) => schema.nullable().transform(() => 0),
                otherwise: (schema) => schema
                    .required(`${t("Duration is required")}.`)
                    .min(1, `${t("Duration must be at least 1")}.`)
                    .integer(`${t("Duration must be a whole number")}.`),
            }),
        location_pricing: yup.array().of(yup.object().shape({
            locations: yup.number().required(`${t("Locations is required")}.`).min(1, `${t("Locations must be at least 1")}.`),
            price: yup.number().required(`${t("Price is required")}.`).min(0, `${t("Price must be positive")}.`),
            special_price: yup.number().nullable().transform((value, originalValue) =>
                originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
            ).min(0, `${t("Special price must be positive")}.`),
            special_price_duration: yup.number().nullable().transform((value, originalValue) =>
                originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
            ).min(0, `${t("Special price duration must be positive")}.`),
            platform_fee: yup.number().nullable().transform((value, originalValue) =>
                originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
            ).min(0, `${t("Platform fee must be positive")}.`)
        })).min(1, `${t("At least one pricing tier is required")}.`),
        recurring: yup.boolean().required(`${t("Recurring setting is required")}.`),
        status: yup.number().required(`${t("Status is required")}.`),
        tools: yup.array().of(yup.object().shape({
            _id: yup.string().required(),
            name: yup.string().required(),
            price: yup.number().nullable().transform((value, originalValue) =>
                originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
            ).min(0, `${t("Tool price must be positive")}.`),
            pricing_mode: yup.string().oneOf(['fixed', 'multiplier'], `${t("Pricing mode must be fixed or multiplier")}.`),
            location_multiplier: yup.number().nullable().transform((value, originalValue) =>
                originalValue === '' || originalValue === null || originalValue === undefined ? 1.0 : value
            ).min(0.1, `${t("Location multiplier must be at least 0.1")}.`).max(10.0, `${t("Location multiplier must be at most 10.0")}.`),
            is_mandatory: yup.boolean()
        })),
        features: yup.array().of(yup.string()).test(
            'has-non-empty-feature',
            `${t("At least one feature is required")}.`,
            (features) => {
                return features && features.some(feature => feature && feature.trim() !== "");
            }
        )
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
        defaultValues: initPlanItem,
        resolver: yupResolver(PlanSchema),
        shouldFocusError: false,
    });

    // Log validation errors whenever they change
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            console.log("=== FORM VALIDATION ERRORS ===");
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
        console.log("=== COMPONENT INITIALIZATION ===");
        console.log("Is edit mode:", isEditMode);
        console.log("Plan ID:", id);

        // Load tools list
        console.log("Loading tools list...");
        dispatch(getToolsList({status:'ACTIVE'}));

        if (isEditMode) {
            console.log("Loading plan data for ID:", id);
            dispatch(getPlan(id));
        } else {
            // Clear any existing plan data from store when in add mode
            console.log("Add mode: Clearing plan state and resetting form...");
            dispatch(cleanPlanState());
            reset(initPlanItem);
        }
    }, [id]);

    // Auto-set recurring and duration based on duration_type
    const watchedDurationType = watch('duration_type');
    useEffect(() => {
        if (watchedDurationType === 'LIFETIME') {
            setValue('recurring', false);
            setValue('duration', 0);
        } else if (watchedDurationType === 'TRIAL') {
            setValue('recurring', false);
        }
    }, [watchedDurationType, setValue]);

    useEffect(() => {
        console.log("=== REDUX STORE UPDATE ===");
        console.log("Store state:", {
            actionFlag: store?.actionFlag,
            success: store?.success,
            error: store?.error,
            loading: store?.loading,
            planItem: store?.planItem
        });

        /* For blank message api called inside */
        if (store?.actionFlag || store?.success || store?.error) {
            dispatch(cleanPlanMessage(null));
        }

        if (store?.actionFlag === "PLAN_CRTD" || store?.actionFlag === "PLAN_UPDT") {
            console.log("Plan operation successful, navigating to plans list");
            navigate(`${appsRoot}/plans`);
        }

        // Only populate form with plan data when in edit mode
        if (isEditMode && ((store?.actionFlag === "PLAN_SCS" && store?.planItem) || store?.planItem?._id)) {

            console.log("Loading plan data for edit mode:", store?.planItem);
            let planItem = { ...store.planItem };

            // Ensure features is always an array with at least one empty string
            if (!planItem.features || planItem.features.length === 0) {
                planItem.features = [""];
            }

            // Ensure location_pricing is always an array
            if (!planItem.location_pricing || planItem.location_pricing.length === 0) {
                // If no location_pricing but has platform_price (old data), create default tier
                if (planItem.platform_price) {
                    planItem.location_pricing = [{
                        locations: 1,
                        price: planItem.platform_price,
                        special_price: null,
                        special_price_duration: 0,
                        platform_fee: 0
                    }];
                } else {
                    planItem.location_pricing = [{
                        locations: 1,
                        price: 0,
                        special_price: null,
                        special_price_duration: 0,
                        platform_fee: 0
                    }];
                }
            } else {
                // Convert old structure to new structure if needed
                planItem.location_pricing = planItem.location_pricing.map(tier => ({
                    locations: tier.locations,
                    price: tier.price || tier.monthly_price || 0,
                    special_price: tier.special_price || null,
                    special_price_duration: tier.special_price_duration || 0,
                    platform_fee: tier.platform_fee || 0
                }));
            }

            // Ensure tools is always an array and has all required pricing fields
            if (!planItem.tools) {
                planItem.tools = [];
            } else {
                // Convert old base_price to new price field if needed
                planItem.tools = planItem.tools.map(tool => ({
                    ...tool,
                    price: tool.price !== undefined ? tool.price : (tool.base_price || 0),
                    pricing_mode: tool.pricing_mode || 'fixed',
                    location_multiplier: tool.location_multiplier !== undefined ? tool.location_multiplier : 1.0,
                    is_mandatory: tool.is_mandatory !== undefined ? tool.is_mandatory : false
                }));
            }

            // Convert duration_type to match select options
            if (planItem.duration_type) {
                const durationOption = DURATION_TYPE_OPTIONS.find(option => option.value === planItem.duration_type);
                if (durationOption) {
                    planItem.duration_type = durationOption.value;
                }
            }

            console.log("Resetting form with plan data:", planItem);
            reset({ ...planItem });
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
        reset(initPlanItem);
        navigate(`${appsRoot}/plans`);
    };

    const onSubmit = (values) => {

        if (values) {
            const planData = {
                name: values?.name || "",
                description: values?.description || "",
                duration_type: values?.duration_type || "",
                duration: parseInt(values?.duration) || 1,
                recurring: Boolean(values?.recurring),
                status: parseInt(values?.status) ?? 1,
                platform_price: parseFloat(values?.platform_price) || 0,
                location_pricing: values?.location_pricing || [],
                tools: values?.tools || [],
                features: values?.features?.filter(f => f.trim() !== "") || [],
                displayOrder: values?.displayOrder || 1,
                metadata: values?.metadata || {}
            };
            if (isEditMode && values?._id) {
                dispatch(updatePlan({ id: values._id, data: planData }));
            } else {
                console.log("Dispatching createPlan");
                dispatch(createPlan(planData));
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
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="mb-0">{isEditMode ? t("Edit Plan") : t("Add Plan")}</h3>

                    <Button
                        type="button"
                        className="ms-2 btn-primary"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={17} />
                    </Button>
                </div>

                <Card>
                    <CardBody>
                        <Row>
                            <Form
                                className=""
                                autoComplete="off"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <Row>
                                    {/* Plan Name */}
                                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                        <Label className="form-label" for="name">
                                            {t("Plan Name")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="name"
                                            name="name"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    className=""
                                                    autoComplete="off"
                                                    invalid={errors.name && true}
                                                    placeholder={t("Enter plan name")}
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.name?.message}</FormFeedback>
                                    </div>


                                    {/* Duration Type */}
                                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                        <Label className="form-label" for="duration_type">
                                            {t("Duration Type")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="duration_type"
                                            name="duration_type"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    isClearable={false}
                                                    options={DURATION_TYPE_OPTIONS.map(option => ({
                                                        ...option,
                                                        label: t(option.label)
                                                    }))}
                                                    className="react-select"
                                                    classNamePrefix="select"
                                                    placeholder={t("Select duration type...")}
                                                    value={DURATION_TYPE_OPTIONS.find(option => option.value === field.value) || null}
                                                    onChange={(selectedOption) => field.onChange(selectedOption?.value || "")}
                                                />
                                            )}
                                        />
                                        <FormFeedback className="d-block">
                                            {errors.duration_type?.message}
                                        </FormFeedback>
                                    </div>

                                    {/* Duration — hidden for Lifetime */}
                                    {watchedDurationType !== 'LIFETIME' && (
                                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                        <Label className="form-label" for="duration">
                                            {t(watchedDurationType === 'TRIAL' ? "Trial Days" : "Duration Time")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="duration"
                                            name="duration"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    className=""
                                                    autoComplete="off"
                                                    invalid={errors.duration && true}
                                                    placeholder={t(watchedDurationType === 'TRIAL' ? "Enter trial days" : "Enter duration")}
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.duration?.message}</FormFeedback>
                                    </div>
                                    )}

                                    {/* Recurring — disabled for Lifetime/Trial */}
                                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                        <Label className="form-label" style={{ marginLeft: "5px" }} for="recurring">
                                            {t("Recurring")} <span className="text-danger">*</span>
                                            {(watchedDurationType === 'LIFETIME' || watchedDurationType === 'TRIAL') && (
                                                <span className="text-muted small ms-50">({t("Not applicable")})</span>
                                            )}
                                        </Label>
                                        <Controller
                                            id="recurring"
                                            name="recurring"
                                            defaultValue={false}
                                            control={control}
                                            render={({ field }) => (
                                                <Row className="px-1 recurring">
                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
                                                        <Input
                                                            style={{ marginLeft: "-18px" }}
                                                            {...field}
                                                            id="recurring_yes"
                                                            type="radio"
                                                            value={true}
                                                            checked={field?.value === true}
                                                            onChange={() => field.onChange(true)}
                                                        />
                                                        <Label className="form-check-label" style={{ marginLeft: "5px" }} for="recurring_yes">
                                                            {t("Yes")}
                                                        </Label>
                                                    </div>

                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
                                                        <Input
                                                            {...field}
                                                            id="recurring_no"
                                                            type="radio"
                                                            value={false}
                                                            checked={field?.value === false}
                                                            onChange={() => field.onChange(false)}
                                                        />
                                                        <Label className="form-check-label" for="recurring_no">
                                                            {t("No")}
                                                        </Label>
                                                    </div>
                                                </Row>
                                            )}
                                        />
                                        <FormFeedback className="d-block">
                                            {errors.recurring?.message}
                                        </FormFeedback>
                                    </div>

                                    {/* Status */}
                                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                                        <Label className="form-label" for="status">
                                            {t("Status")} <span className="text-danger">*</span>
                                        </Label>
                                        <Controller
                                            id="status"
                                            name="status"
                                            defaultValue={1}
                                            control={control}
                                            render={({ field }) => (
                                                <Row className="px-1 status">
                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
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

                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
                                                        <Input
                                                            {...field}
                                                            id="status_inactive"
                                                            type="radio"
                                                            value={0}
                                                            checked={field?.value === 0}
                                                            onChange={() => field.onChange(0)}
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

                                {/* Location Pricing Section */}
                                <Row className="mt-3">
                                    <div className="col-12 ">
                                        <Controller
                                            name="location_pricing"
                                            control={control}
                                            render={({ field }) => (
                                                <LocationPricingManager
                                                    locationPricing={field.value || []}
                                                    onChange={field.onChange}
                                                    errors={errors}
                                                />
                                            )}
                                        />
                                    </div>
                                </Row>

                                {/* Tools Section */}
                                <Row className="mt-3">
                                    <div className="col-12 ">
                                        <Controller
                                            name="tools"
                                            control={control}
                                            render={({ field }) => (
                                                <ToolsSelector
                                                    availableTools={store?.toolItems || []}
                                                    selectedTools={field.value || []}
                                                    onChange={field.onChange}
                                                    errors={errors}
                                                />
                                            )}
                                        />
                                    </div>
                                </Row>

                                {/* Features Section */}
                                <Row className="mt-3">
                                    <div className="col-12 ">
                                        <Controller
                                            name="features"
                                            control={control}
                                            render={({ field }) => (
                                                <FeaturesManager
                                                    features={field.value || [""]}
                                                    onChange={field.onChange}
                                                    errors={errors}
                                                />
                                            )}
                                        />
                                    </div>
                                </Row>

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
                            </Form>
                        </Row>
                    </CardBody>
                </Card>
            </div>
        </Fragment>
    );
};

export default PlanForm;