// ** React Imports
import { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
    getSubscription,
    updateSubscription,
    getToolsList,
    cleanSubscriptionMessage,
} from "../store";
import moment from "moment";

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
    Alert,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { ArrowLeft, X, Check, MapPin } from "react-feather";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";

// ** Styles
import '@src/views/auth/register/components/PaymentSummary.scss';
import './EditSubscription.scss';

// ** Constant
import { appsRoot, taxLabel as defaultTaxLabel, taxValue as defaultTaxPercentage } from "@constant/defaultValues";

// ** Utils
import { formatPrice } from "@src/utility/Utils";
import instance from '@src/utility/AxiosConfig';

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

/**
 * Format location rules for display
 * @param {Array} locationRules - Array of location rule objects
 * @param {Function} t - Translation function
 * @returns {String|null} - Formatted location rules message or null
 */
const formatLocationRules = (locationRules, t) => {
    if (!locationRules || locationRules.length === 0) return null;

    const messages = locationRules.map(rule => {
        switch (rule.type) {
            case 'any':
                return t('Any number of locations');
            case 'exact':
                return t('Exactly {{count}} location(s)', { count: rule.value });
            case 'minimum':
                return t('{{count}} or more locations', { count: rule.value });
            case 'maximum':
                return t('Up to {{count}} location(s)', { count: rule.value });
            case 'range':
                return t('{{min}} to {{max}} locations', { min: rule.min, max: rule.max });
            default:
                return null;
        }
    }).filter(Boolean);

    return messages.length > 0 ? messages.join(` ${t('or')} `) : null;
};

const SubscriptionForm = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { getCurrencySymbol } = useCurrency();

    const store = useSelector((state) => state.subscription);
    const isEditMode = !!id;
    const islifetime = store?.planItem?.is_lifetime === true;
    const isTrialPlan = store?.planItem?.trial === true;

    const [submitting, setSubmitting] = useState(false);
    useFormLoading(submitting);
    // State for addon tools selection
    const [availableTools, setAvailableTools] = useState([]);
    const [selectedAddonTools, setSelectedAddonTools] = useState([]);
    // State for tracking which current tools are included
    const [allCurrentTools, setAllCurrentTools] = useState([]);
    const [includedCurrentTools, setIncludedCurrentTools] = useState([]);
    // State for tracking notifications
    const [lastNotificationFlag, setLastNotificationFlag] = useState("");
    // State for discount code
    const [discountCode, setDiscountCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    // State for plan price (was platform price)
    const [planPrice, setPlanPrice] = useState(0);
    // State for locations
    const [selectedLocations, setSelectedLocations] = useState(1);
    const [locationTiers, setLocationTiers] = useState([]);
    // State for custom location mode
    const [isCustomLocation, setIsCustomLocation] = useState(false);
    const [customLocationValue, setCustomLocationValue] = useState("");
    // State for current active location count of the company being edited
    const [activeLocationCount, setActiveLocationCount] = useState(0);

    // Validation Schema - Super Admin has full control, so dates are optional
    const SubscriptionSchema = yup.object().shape({
        customer: yup.string(), // Optional since it's disabled
        company_name: yup.string(), // Optional since it's disabled
        email: yup.string().email(t("Invalid email")), // Optional since it's disabled
        plan: yup.string(), // Optional since it's disabled
        start_date: yup.string().nullable(), // Optional since it's disabled
        end_date: yup
            .string()
            .nullable()
            .transform((v) => (v === "" ? null : v)),
            // Super Admin can set or leave empty for any plan type

        next_billing_date: yup
            .string()
            .nullable()
            .transform((v) => (v === "" ? null : v)),
            // Super Admin can set or leave empty for any plan type

        total_price: yup
            .number()
            .typeError(t("Total Price must be a number"))
            .min(0, t("Total Price must be positive")), // Optional since it's calculated
        plan_price: yup
            .number()
            .typeError(t("Plan Price must be a number"))
            .min(0, t("Plan Price must be positive")),
            // Plan price can be 0 for custom plans
        status: yup.number().required(t("Status is required")),
        tools: yup.array(), // tools should always be an array
        addon_tools: yup.array(), // addon tools array
    });

    // Form Setup
    const {
        reset,
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        mode: "onChange",
        defaultValues: {
            customer: "",
            company_name: "",
            email: "",
            plan: "",
            start_date: "",
            end_date: "",
            next_billing_date: "",
            total_price: 0,
            plan_price: 0,
            status: 1,
            tools: [], // <-- default as empty array
            addon_tools: [], // <-- default as empty array
        },
        resolver: yupResolver(SubscriptionSchema),
    });

    const watchedEndDate = watch("end_date");

    // Calculate tool price based on pricing_mode and location
    const calculateToolPrice = useCallback((tool) => {
        const basePrice = tool.base_price ?? tool.price ?? 0;
        const pricingMode = tool.pricing_mode || 'fixed';
        const locationMultiplier = tool.location_multiplier || 1.0;

        if (pricingMode === 'multiplier') {
            // Always apply the multiplier for multiplier mode
            return basePrice * selectedLocations * locationMultiplier;
        }
        return basePrice;
    }, [selectedLocations]);

    // Get plan base price from location_pricing tiers
    const getPlanBasePrice = useCallback((tiers, locations) => {
        if (!tiers || tiers.length === 0) return planPrice;
        const sortedTiers = [...tiers].sort((a, b) => b.locations - a.locations);
        const currentTier = sortedTiers.find(tier => tier.locations <= locations) || tiers[0];
        return currentTier?.special_price > 0
            ? currentTier.special_price
            : (currentTier?.price || 0);
    }, [planPrice]);

    // Handle location change
    const handleLocationChange = useCallback((e) => {
        const value = e.target.value;

        // Check if "custom" option is selected
        if (value === 'custom') {
            setIsCustomLocation(true);
            setCustomLocationValue("");
            // Set plan price to 0 for custom location
            setPlanPrice(0);
            setValue('plan_price', 0);
            return;
        }

        const newLocations = parseInt(value);
        setSelectedLocations(newLocations);
        setIsCustomLocation(false);

        // Update plan price based on new location tier
        const newPlanPrice = getPlanBasePrice(locationTiers, newLocations);
        setPlanPrice(newPlanPrice);
        setValue('plan_price', newPlanPrice);
    }, [locationTiers, getPlanBasePrice, setValue]);

    // Handle custom location input change
    const handleCustomLocationChange = useCallback((e) => {
        const value = e.target.value;
        setCustomLocationValue(value);

        const numValue = parseInt(value) || 0;
        if (numValue > 0) {
            setSelectedLocations(numValue);
        }
        // Plan price remains as set by admin (editable)
    }, []);

    // Revert from custom location to dropdown
    const handleRevertToDropdown = useCallback(() => {
        setIsCustomLocation(false);
        setCustomLocationValue("");

        // Set to first tier value
        if (locationTiers.length > 0) {
            const sortedTiers = [...locationTiers].sort((a, b) => a.locations - b.locations);
            const firstTier = sortedTiers[0];
            setSelectedLocations(firstTier.locations);

            // Update plan price based on tier
            const newPlanPrice = firstTier.special_price > 0 ? firstTier.special_price : firstTier.price;
            setPlanPrice(newPlanPrice);
            setValue('plan_price', newPlanPrice);
        }
    }, [locationTiers, setValue]);

    useEffect(() => {
        if (isEditMode) dispatch(getSubscription(id));
        // Fetch available tools
        dispatch(getToolsList({ status: 'ACTIVE' }));
    }, [id, isEditMode, dispatch]);

    useEffect(() => {
        if (store?.planItem) {
            const addonTools = Array.isArray(store.planItem?.addon_tools)
                ? store.planItem.addon_tools.map((tool) => ({
                    _id: tool._id,
                    name: tool.name,
                    price: tool.price,
                }))
                : [];

            // Set location tiers and selected locations from subscription
            const tiers = store.planItem?.location_pricing || store.planItem?.plan?.location_pricing || [];
            setLocationTiers(tiers);
            setSelectedLocations(store.planItem?.locations || 1);

            // Fetch current active location count for downgrade validation
            const subscriptionCompanyId = store.planItem?.company_id?._id || store.planItem?.company_id;
            if (subscriptionCompanyId && isEditMode) {
                instance.get(`/admin/location/capacity`, { params: { company_id: subscriptionCompanyId } })
                    .then(res => {
                        if (res?.data?.data?.current !== undefined) {
                            setActiveLocationCount(res.data.data.current);
                        }
                    })
                    .catch(() => {});
            }

            // Check if this subscription has custom location
            if (store.planItem?.is_custom_location === true) {
                setIsCustomLocation(true);
                setCustomLocationValue(String(store.planItem?.locations || ""));
            } else {
                setIsCustomLocation(false);
                setCustomLocationValue("");
            }

            // Build tool list - prioritize subscription tools for pricing data
            const subscriptionTools = store.planItem?.tools || [];
            const planTools = store.planItem?.plan?.tools || [];

            // Create a map of subscription tools for quick lookup
            const subscriptionToolMap = {};
            subscriptionTools.forEach(tool => {
                subscriptionToolMap[tool._id] = tool;
            });

            // Create a map of plan tools for pricing_mode and location_multiplier lookup
            const planToolMap = {};
            planTools.forEach(tool => {
                planToolMap[tool._id] = tool;
            });

            // Start with subscription tools (they have the correct stored prices)
            // Look up pricing_mode, location_multiplier and base_price from plan tools as authoritative source
            let allPlanTools = subscriptionTools.map((tool) => {
                const planTool = planToolMap[tool._id] || {};
                // Use plan tool's price as the true base price (authoritative source)
                // This avoids using a previously calculated price as base_price
                const trueBasePrice = planTool.base_price ?? planTool.price ?? tool.base_price ?? tool.price ?? 0;
                return {
                    _id: tool._id,
                    name: tool.name,
                    description: tool.description,
                    base_price: trueBasePrice,
                    price: tool.calculated_price || tool.price || 0,
                    pricing_mode: planTool.pricing_mode || tool.pricing_mode || 'fixed',
                    location_multiplier: planTool.location_multiplier ?? tool.location_multiplier ?? 1.0,
                    mandatory: planTool.mandatory || planTool.is_mandatory || tool.mandatory || tool.is_mandatory || false,
                    included: true,
                };
            });

            // Add plan tools that aren't in subscription (new tools — available but not selected)
            planTools.forEach((planTool) => {
                if (!subscriptionToolMap[planTool._id]) {
                    const isMandatory = planTool.mandatory || planTool.is_mandatory || false;
                    allPlanTools.push({
                        _id: planTool._id,
                        name: planTool.name,
                        description: planTool.description,
                        base_price: planTool.base_price ?? planTool.price ?? 0,
                        price: planTool.price || 0,
                        pricing_mode: planTool.pricing_mode || 'fixed',
                        location_multiplier: planTool.location_multiplier ?? 1.0,
                        mandatory: isMandatory,
                        included: isMandatory,
                        _isNew: true, // New tool added to plan after subscription
                    });
                }
            });

            // Mark subscription tools not in plan as legacy
            allPlanTools = allPlanTools.map(tool => {
                if (!planToolMap[tool._id] && subscriptionToolMap[tool._id]) {
                    return { ...tool, _isLegacy: true };
                }
                return tool;
            });

            // Get currently selected tools in the subscription
            const currentToolIds = subscriptionTools.map(t => t._id);

            // Use the combined tools list as currentTools
            const currentTools = allPlanTools;

            // Get plan price - prefer plan_price, fallback to platform_price for backward compat
            const subscriptionPlanPrice = store.planItem?.plan_price ?? store.planItem?.platform_price ?? 0;

            reset({
                customer: store.planItem?.user?.name || "",
                company_name: store.planItem?.company?.company_name || "",
                email: store.planItem?.company?.email || store.planItem?.user?.email || "",
                plan: store.planItem?.plan?.name || "",
                start_date: store.planItem?.start_date
                    ? moment(store.planItem.start_date).format("YYYY-MM-DD")
                    : "",
                end_date: store.planItem?.end_date
                    ? moment(store.planItem.end_date).format("YYYY-MM-DD")
                    : "",
                next_billing_date: store.planItem?.next_date
                    ? moment(store.planItem.next_date).format("YYYY-MM-DD")
                    : "",
                tools: currentTools,
                addon_tools: addonTools,
                total_price: store.planItem?.subtotal || store.planItem?.total_price || 0,
                plan_price: subscriptionPlanPrice,
                status: store.planItem?.status ? 1 : 0,
            });

            // Set plan price state
            setPlanPrice(subscriptionPlanPrice);

            // Set discount information if available
            if (store.planItem?.discount_code) {
                setDiscountCode(store.planItem.discount_code);
                
                // Fetch complete discount information from API
                const fetchDiscountInfo = async () => {
                    try {
                        const response = await instance.get('/public/discount/validate', {
                            params: {
                                discount_code: store.planItem.discount_code.trim(),
                                amount: store.planItem?.subtotal || ((store.planItem?.plan_price || store.planItem?.platform_price || 0) + (store.planItem?.tools_price || 0)),
                                user_id: store.planItem?.user?._id || store.planItem?.user_id
                            }
                        });

                        if (response?.data?.statusCode === 200 && response?.data?.data) {
                            const discountData = response.data.data;
                            
                            if (discountData.valid && discountData.can_apply) {
                                setAppliedDiscount({
                                    code: discountData.discount_code,
                                    discount_price: store.planItem.discount_price || 0, // Use stored amount
                                    discount_id: discountData.discount_id,
                                    discount_type: discountData.discount?.type,
                                    discount_value: discountData.discount?.value,
                                    // Duration info from API response or stored subscription
                                    duration_type: discountData.duration?.type || store.planItem.discount_duration_type || null,
                                    duration_months: discountData.duration?.months || store.planItem.discount_duration_months || null,
                                    remaining_months: store.planItem.discount_remaining_months || null,
                                    // Location rules from API or stored subscription
                                    location_rules: discountData.location_rules || store.planItem.discount_location_rules || []
                                });
                            } else {
                                // Discount is no longer valid, use stored data but mark as invalid
                                setAppliedDiscount({
                                    code: store.planItem.discount_code,
                                    discount_price: store.planItem.discount_price || 0,
                                    discount_id: store.planItem.discount_id || null,
                                    discount_type: store.planItem.discount_type || 'fixed',
                                    discount_value: store.planItem.discount_value || store.planItem.discount_price || 0,
                                    // Duration info from stored subscription
                                    duration_type: store.planItem.discount_duration_type || null,
                                    duration_months: store.planItem.discount_duration_months || null,
                                    remaining_months: store.planItem.discount_remaining_months || null,
                                    // Location rules from stored subscription
                                    location_rules: store.planItem.discount_location_rules || []
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching discount info:', error);
                        // Fallback to stored data
                        setAppliedDiscount({
                            code: store.planItem.discount_code,
                            discount_price: store.planItem.discount_price || 0,
                            discount_id: store.planItem.discount_id || null,
                            discount_type: store.planItem.discount_type || 'fixed',
                            discount_value: store.planItem.discount_value || store.planItem.discount_price || 0,
                            // Duration info from stored subscription
                            duration_type: store.planItem.discount_duration_type || null,
                            duration_months: store.planItem.discount_duration_months || null,
                            remaining_months: store.planItem.discount_remaining_months || null,
                            // Location rules from stored subscription
                            location_rules: store.planItem.discount_location_rules || []
                        });
                    }
                };
                
                fetchDiscountInfo();
            }

            // Set all current tools and included tools
            setAllCurrentTools(currentTools);
            // Only set tools that are actually included in the subscription or are mandatory
            setIncludedCurrentTools(currentTools.filter(tool => tool.included || tool.mandatory || tool.is_mandatory).map(tool => tool._id));
            // Sync selectedAddonTools state
            setSelectedAddonTools(addonTools);
        }

        // Only show notifications for update operations, not for listing/get operations
        if (store?.success && store?.actionFlag && store.actionFlag !== lastNotificationFlag) {
            if (store.actionFlag === "SUBS_UPDT") {
                Notification("Success", store.success, "success");
                setLastNotificationFlag(store.actionFlag);
                // Clean the message after showing notification
                setTimeout(() => {
                    dispatch(cleanSubscriptionMessage());
                }, 100);
            }
        }

        if (store?.error && store?.actionFlag && store.actionFlag !== lastNotificationFlag) {
            if (store.actionFlag === "SUBS_UPDT_ERR") {
                Notification("Error", store.error, "warning");
                setLastNotificationFlag(store.actionFlag);
                // Clean the message after showing notification
                setTimeout(() => {
                    dispatch(cleanSubscriptionMessage());
                }, 100);
            }
        }
    }, [store.planItem, store.success, store.error, reset, setValue]);

    // Filter available tools (exclude tools already in subscription and addon tools)
    useEffect(() => {
        if (store?.toolItems && store?.planItem) {
            const existingToolIds = store.planItem?.tools?.map(tool => tool._id) || [];
            const addonToolIds = store.planItem?.addon_tools?.map(tool => tool._id) || [];
            const allExistingIds = [...existingToolIds, ...addonToolIds];
            const filtered = store.toolItems.filter(tool => !allExistingIds.includes(tool._id));
            setAvailableTools(filtered);
        } else if (store?.toolItems) {
            setAvailableTools(store.toolItems);
        }
    }, [store.toolItems, store.planItem]);

    // Re-validate discount when location count changes
    useEffect(() => {
        const validateDiscountOnLocationChange = async () => {
            // Only check if there's an applied discount with location rules
            if (!appliedDiscount?.location_rules || appliedDiscount.location_rules.length === 0) {
                return;
            }

            // Check if current location count matches any location rule
            const isEligible = appliedDiscount.location_rules.some(rule => {
                switch (rule.type) {
                    case 'any':
                        return true;
                    case 'exact':
                        return selectedLocations === rule.value;
                    case 'minimum':
                        return selectedLocations >= (rule.value || 0);
                    case 'maximum':
                        return selectedLocations <= (rule.value || Infinity);
                    case 'range':
                        return selectedLocations >= (rule.min || 0) && selectedLocations <= (rule.max || Infinity);
                    default:
                        return false;
                }
            });

            if (!isEligible) {
                // Format the location rules for display
                const rulesText = formatLocationRules(appliedDiscount.location_rules, t);
                Notification(
                    'Warning',
                    t('Your discount code requires {{rules}}. Changing to {{count}} location(s) will remove this discount.', {
                        rules: rulesText,
                        count: selectedLocations
                    }),
                    'warning'
                );
                // Remove the discount
                setAppliedDiscount(null);
                setDiscountCode('');
            }
        };

        // Only run if selectedLocations has been initialized and changed
        if (selectedLocations > 0 && appliedDiscount) {
            validateDiscountOnLocationChange();
        }
    }, [selectedLocations]);

    const handleAddonToolSelection = (tool, isSelected) => {
        let updatedTools = [...selectedAddonTools];

        if (isSelected) {
            updatedTools.push({
                _id: tool._id,
                name: tool.name,
                price: 0
            });
        } else {
            updatedTools = updatedTools.filter(t => t._id !== tool._id);
        }

        setSelectedAddonTools(updatedTools);
        // Update form state as well
        setValue('addon_tools', updatedTools);
    };

    const handleAddonToolPriceChange = (toolId, price) => {
        // If price editing is disabled (trial/lifetime), don't allow changes
        if (!isPriceEditable()) {
            return;
        }

        const newPrice = price === "" ? "" : parseFloat(price);

        setSelectedAddonTools(prev => {
            let updated = [...prev];

            // If price is empty -> just update field visually
            if (price === "") {
                updated = updated.map(tool =>
                    tool._id === toolId ? { ...tool, price: "" } : tool
                );
                setValue("addon_tools", updated);
                return updated;
            }

            // If user typed valid number >= 0, allow zero price for custom plans
            if (newPrice >= 0) {
                // If tool not selected, add it
                if (!updated.some(t => t._id === toolId)) {
                    const toolData = availableTools.find(t => t._id === toolId);
                    updated.push({ _id: toolId, name: toolData?.name || "", price: newPrice });
                } else {
                    updated = updated.map(tool =>
                        tool._id === toolId ? { ...tool, price: newPrice } : tool
                    );
                }
            }

            setValue("addon_tools", updated);
            return updated;
        });
    };


    const isAddonToolSelected = (toolId) => {
        return selectedAddonTools.some(tool => tool._id === toolId);
    };

    const getAddonToolPrice = (toolId) => {
        const tool = selectedAddonTools.find(tool => tool._id === toolId);
        return tool ? tool.price : 0;
    };

    // Helper functions for current tools — Super Admin can toggle ALL tools including mandatory
    const handleCurrentToolToggle = (toolId, isIncluded) => {
        let updatedIncluded = [...includedCurrentTools];

        if (isIncluded) {
            if (!updatedIncluded.includes(toolId)) {
                updatedIncluded.push(toolId);
            }
        } else {
            updatedIncluded = updatedIncluded.filter(id => id !== toolId);
        }

        setIncludedCurrentTools(updatedIncluded);

        // Update form state to only include selected tools
        const includedTools = allCurrentTools.filter(tool => updatedIncluded.includes(tool._id));
        setValue('tools', includedTools);
    };

    const handleCurrentToolPriceChange = (toolId, price) => {
        // If price editing is disabled (trial/lifetime), don't allow changes
        if (!isPriceEditable()) {
            return;
        }

        const newPrice = price === "" ? "" : parseFloat(price);

        // Just update visually if cleared
        if (price === "") {
            setAllCurrentTools(prev =>
                prev.map(tool =>
                    tool._id === toolId ? { ...tool, price: "" } : tool
                )
            );
            return;
        }

        // If valid price >= 0 → update tool
        // For custom location plans, allow zero price without removing the tool
        if (newPrice >= 0) {
            setAllCurrentTools(prev =>
                prev.map(tool =>
                    tool._id === toolId ? { ...tool, price: newPrice } : tool
                )
            );
            return;
        }
    };


    const isCurrentToolIncluded = (toolId) => {
        return includedCurrentTools.includes(toolId);
    };

    const getCurrentToolPrice = (toolId) => {
        const tool = allCurrentTools.find(tool => tool._id === toolId);
        return tool ? tool.price : 0;
    };

    // Helper function to check if price can be edited
    // Super Admin has full control over all plan types (paid, trial, lifetime)
    const isPriceEditable = () => {
        // This is the Super Admin edit page - always allow editing
        return true;
    };

    // Helper function to check if location can be edited
    // Super Admin has full control over all plan types (paid, trial, lifetime)
    const isLocationEditable = () => {
        // This is the Super Admin edit page - always allow editing
        return true;
    };

    // Handle discount code application
    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) {
            Notification('Warning', t('Please enter a discount code'), 'warning');
            return;
        }

        setDiscountLoading(true);
        try {
            // Calculate current subtotal using the same logic as calculateTotals
            const { subtotal: currentSubtotal } = calculateTotals();

            // Use validate-with-location endpoint to check all discount conditions including location rules
            const response = await instance.get('/public/discount/validate-with-location', {
                params: {
                    discount_code: discountCode.trim(),
                    amount: currentSubtotal,
                    locations: selectedLocations,
                    user_id: store?.planItem?.user?._id || store?.planItem?.user_id
                }
            });

            if (response?.data?.statusCode === 200 && response?.data?.data) {
                const discountData = response.data.data;

                // Check if discount is valid
                if (discountData.valid && discountData.can_apply) {
                    // Get discount amount from preview if available
                    const discountAmount = discountData.preview?.discount_amount || 0;

                    setAppliedDiscount({
                        code: discountData.discount_code,
                        discount_price: discountAmount,
                        discount_id: discountData.discount_id,
                        discount_type: discountData.discount?.type,
                        discount_value: discountData.discount?.value,
                        // Duration info for display
                        duration_type: discountData.duration?.type,
                        duration_months: discountData.duration?.months,
                        duration_info: discountData.duration_info,
                        // Location rules for display
                        location_rules: discountData.location_rules || []
                    });

                    Notification('Success', discountData.message || t('Discount code applied successfully'), 'success');
                } else {
                    // Show specific error message for location eligibility
                    const errorMessage = discountData.message ||
                        (discountData.error_type === 'LOCATION_INELIGIBLE'
                            ? t('This discount code is not valid for your current number of locations')
                            : t('Invalid discount code'));
                    Notification('Error', errorMessage, 'error');
                    setAppliedDiscount(null);
                }
            } else {
                throw new Error(response?.data?.message || 'Invalid discount code');
            }
        } catch (error) {
            console.error('Discount validation error:', error);
            const errorMessage = error.response?.data?.data?.message ||
                error.response?.data?.message ||
                error.message ||
                t('Invalid discount code');
            Notification('Error', errorMessage, 'error');
            setAppliedDiscount(null);
        } finally {
            setDiscountLoading(false);
        }
    };

    // Handle discount code removal
    const handleRemoveDiscount = () => {
        setDiscountCode('');
        setAppliedDiscount(null);
    };

    // Calculate pricing totals
    const calculateTotals = () => {
        const includedTools = allCurrentTools.filter(tool => includedCurrentTools.includes(tool._id));
        const allSelectedTools = [...includedTools, ...selectedAddonTools];

        // For paid plans with price editing enabled, use the edited prices directly
        const toolsTotal = allSelectedTools.reduce((sum, tool) => {
            // Always use the current tool.price (which may have been edited by admin)
            return sum + (parseFloat(tool.price) || 0);
        }, 0);

        const subtotal = planPrice + toolsTotal;

        // Recalculate discount based on current subtotal if discount is applied
        let discountPrice = 0;
        if (appliedDiscount && appliedDiscount.discount_type && appliedDiscount.discount_value) {
            if (appliedDiscount.discount_type === 'percentage') {
                discountPrice = (subtotal * appliedDiscount.discount_value) / 100;
            } else if (appliedDiscount.discount_type === 'fixed') {
                discountPrice = appliedDiscount.discount_value;
            }
            
            // Ensure discount doesn't exceed subtotal
            if (discountPrice > subtotal) {
                discountPrice = subtotal;
            }
        }

        const subtotalAfterDiscount = discountPrice > 0 ? subtotal - discountPrice : subtotal;

        // Use tax_info from backend (env TAX_VALUE), fallback to stored or default
        const taxPercentage = store.planItem?.tax_info?.value ?? store.planItem?.tax_percentage ?? defaultTaxPercentage ?? 0;
        const taxValue = (subtotalAfterDiscount * taxPercentage) / 100;
        const finalPrice = subtotalAfterDiscount + taxValue;

        return {
            toolsTotal,
            subtotal,
            discountPrice,
            subtotalAfterDiscount,
            taxPercentage,
            taxValue,
            finalPrice,
            selectedToolsData: allSelectedTools
        };
    };

    const handleCancel = () => navigate(-1);

    const onSubmit = async (values) => {
        console.log("Form submitted with values:", values);
        console.log("Form errors:", errors);

        if (!isEditMode || !store?.planItem) {
            console.log("Submission blocked - isEditMode:", isEditMode, "planItem:", store?.planItem);
            return;
        }
        setSubmitting(true);
        try {

        // Get only included current tools
        const includedTools = allCurrentTools.filter(tool => includedCurrentTools.includes(tool._id));

        // Combine all selected tools (existing + addon) into single array with new structure
        // For paid plans, use the edited price directly; otherwise use calculated price
        const allSelectedTools = [
            ...includedTools.map((tool) => {
                const editedPrice = isTrialPlan ? 0 : (parseFloat(tool.price) || 0);
                const toolFromList = (store?.toolItems || []).find(t => t._id === tool._id);
                return {
                    _id: tool._id,
                    name: tool.name,
                    slug: toolFromList?.slug || tool.slug || '',
                    base_price: isTrialPlan ? 0 : (tool.base_price || editedPrice || 0),
                    pricing_mode: tool.pricing_mode || 'fixed',
                    location_multiplier: tool.location_multiplier || 1.0,
                    calculated_price: editedPrice,
                    type: 'existing'
                };
            }),
            ...selectedAddonTools.map((tool) => {
                const editedPrice = isTrialPlan ? 0 : (parseFloat(tool.price) || 0);
                const toolFromList = (store?.toolItems || []).find(t => t._id === tool._id);
                return {
                    _id: tool._id,
                    name: tool.name,
                    slug: toolFromList?.slug || tool.slug || '',
                    base_price: isTrialPlan ? 0 : (tool.base_price || editedPrice || 0),
                    pricing_mode: tool.pricing_mode || 'fixed',
                    location_multiplier: tool.location_multiplier || 1.0,
                    calculated_price: editedPrice,
                    type: 'addon'
                };
            })
        ];

        // Calculate pricing using the edited tool prices
        const tools_price = Number(
            allSelectedTools
                .reduce((total, tool) => total + (tool.calculated_price || 0), 0)
                .toFixed(2)
        );
        const plan_price_value = parseFloat(values.plan_price) || planPrice || 0;
        const subtotal = Number((plan_price_value + tools_price).toFixed(2));

        // Use the recalculated discount from calculateTotals instead of fixed amount
        const { discountPrice: recalculatedDiscount } = calculateTotals();
        const total_after_discount = recalculatedDiscount > 0 ? subtotal - recalculatedDiscount : subtotal;

        // Use tax_info from backend (env TAX_VALUE), fallback to stored or default
        const tax_percentage = Number(store.planItem?.tax_info?.value ?? store.planItem?.tax_percentage ?? defaultTaxPercentage ?? 0);
        const tax_price = Number((total_after_discount * tax_percentage / 100).toFixed(2));
        const final_price = Number((total_after_discount + tax_price).toFixed(2));

        const payload = {
            end_date: values.end_date,
            next_date: values.next_billing_date, // Include next billing date for paid plans
            locations: selectedLocations,
            is_custom_location: isCustomLocation, // Flag for custom location
            plan_price: plan_price_value,
            tools_price: tools_price,
            subtotal: subtotal,
            discount_price: recalculatedDiscount,
            tax_price: tax_price,
            final_price: final_price,
            status: values.status === 1 || values.status === "1" || values.status === true,
            tools: allSelectedTools, // Send all tools with new structure
            // Include discount information if applied
            discount_code: appliedDiscount?.code || null,
            discount_id: appliedDiscount?.discount_id || null,
        };


        await dispatch(updateSubscription({ id: store.planItem._id, data: payload }))
            .then((response) => {
                // Update tools in localStorage if impersonating (so sidebar reflects)
                try {
                    const raw = localStorage.getItem('userData');
                    if (raw) {
                        const stored = JSON.parse(raw);
                        if (stored?.companyData) stored.companyData.tools = allSelectedTools;
                        if (stored?.userData?.company) stored.userData.company.tools = allSelectedTools;
                        localStorage.setItem('userData', JSON.stringify(stored));
                    }
                } catch { }

                // Reset form data after successful update
                reset();
                setAllCurrentTools([]);
                setIncludedCurrentTools([]);
                setSelectedAddonTools([]);

                Notification("Success", t("Subscription updated successfully"), "success");

                setTimeout(() => {
                    navigate(-1);
                },);
            })
            .catch((error) => {
                console.error("Update failed:", error);
                Notification("Error", t("Failed to update subscription"), "error");
            });
        } finally {
            setSubmitting(false);
        }
    };

    const {
        toolsTotal,
        subtotal,
        discountPrice,
        subtotalAfterDiscount,
        taxPercentage,
        taxValue,
        finalPrice,
        selectedToolsData
    } = calculateTotals();

    return (
        <Fragment>
            <div className="main-content admin-edit-subscription-page">
                {/* Header */}
                <div className="page-header d-flex align-items-center justify-content-between">
                    <div>
                        <h3>{t("Edit Subscription")}</h3>
                        <p className="subtitle">{t("Manage subscription details and pricing")}</p>
                    </div>
                    <Button color="primary" outline onClick={handleCancel}>
                        <ArrowLeft size={16} className="me-50" />
                        {t("Back")}
                    </Button>
                </div>

                <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                    <div className="row">
                        {/* LEFT COLUMN */}
                        <div className="col-xl-7 col-lg-7">
                            {/* Company Info Card */}
                            <div className="company-info-card">
                                <h4 className="company-title">
                                    <Controller
                                        name="company_name"
                                        control={control}
                                        render={({ field }) => field.value || t("N/A")}
                                    />
                                </h4>
                                <div className="plan-badge">
                                    <Controller
                                        name="plan"
                                        control={control}
                                        render={({ field }) => field.value || t("N/A")}
                                    />
                                </div>
                                <div className="info-list">
                                    <div className="info-item">
                                        <span className="label">{t("Contact Person")}</span>
                                        <span className="value">
                                            <Controller
                                                name="customer"
                                                control={control}
                                                render={({ field }) => field.value || t("N/A")}
                                            />
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t("Email")}</span>
                                        <span className="value">
                                            <Controller
                                                name="email"
                                                control={control}
                                                render={({ field }) => field.value || t("N/A")}
                                            />
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">{t("Start Date")}</span>
                                        <span className="value">
                                            <Controller
                                                name="start_date"
                                                control={control}
                                                render={({ field }) => field.value || t("N/A")}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Editable Fields Section */}
                            <div className="form-section">
                                <div className="section-header">
                                    <h5>{t("Subscription Details")}</h5>
                                    <p className="section-subtitle">{t("Edit pricing and subscription settings")}</p>
                                </div>

                                <Row>
                                    {/* Locations Selector */}
                                    {locationTiers.length > 0 && (
                                        <div className="mb-3 col-md-6">
                                            <Label for="locations">
                                                <MapPin size={14} className="me-1" />
                                                {t("Number of Locations")}
                                                {isCustomLocation && (
                                                    <small className="text-success ms-1">({t("Custom")})</small>
                                                )}
                                            </Label>
                                            {isCustomLocation ? (
                                                <div className="custom-location-input">
                                                    <div className="input-group">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={customLocationValue}
                                                            onChange={handleCustomLocationChange}
                                                            placeholder={t("Enter location count")}
                                                            className="form-control"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary custom-location-close"
                                                            onClick={handleRevertToDropdown}
                                                            title={t("Back to dropdown")}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <small className="text-muted mt-1 d-block">
                                                        {t("Enter custom location count. Plan price will be set manually.")}
                                                    </small>
                                                </div>
                                            ) : (
                                                <select
                                                    className="form-select"
                                                    value={selectedLocations}
                                                    onChange={handleLocationChange}
                                                    disabled={!isLocationEditable()}
                                                >
                                                    {[...locationTiers]
                                                        .sort((a, b) => a.locations - b.locations)
                                                        .map((tier) => (
                                                            <option key={tier.locations} value={tier.locations}>
                                                                {tier.locations} {tier.locations === 1 ? t('Location') : t('Locations')}
                                                                {tier.special_price > 0
                                                                    ? ` - ${formatPrice(tier.special_price)}`
                                                                    : ` - ${formatPrice(tier.price)}`}
                                                                {tier.special_price > 0 && tier.price > tier.special_price && (
                                                                    ` (Save ${formatPrice(tier.price - tier.special_price)})`
                                                                )}
                                                            </option>
                                                        ))}
                                                    {/* Custom option for Super Admin */}
                                                    {isPriceEditable() && (
                                                        <option value="custom">
                                                            {t("Custom Location Count...")}
                                                        </option>
                                                    )}
                                                </select>
                                            )}

                                            {/* Downgrade conflict warning */}
                                            {isEditMode && activeLocationCount > 0 && selectedLocations < activeLocationCount && (
                                                <Alert color="danger" className="mt-2 mb-0 py-2 px-3 small">
                                                    <strong>{t("Downgrade Conflict")}:</strong>{" "}
                                                    {t("This company has")} <strong>{activeLocationCount}</strong>{" "}
                                                    {t("active location(s). Reducing to")} <strong>{selectedLocations}</strong>{" "}
                                                    {t("will be blocked until they deactivate")}{" "}
                                                    <strong>{activeLocationCount - selectedLocations}</strong>{" "}
                                                    {t("location(s) first.")}{" "}
                                                </Alert>
                                            )}
                                        </div>
                                    )}

                                    {/* Plan Price */}
                                    <div className="mb-3 col-md-6">
                                        <Label for="plan_price">
                                            {t("Plan Price")}
                                            {isPriceEditable() && (
                                                <small className="text-success ms-1">({t("Editable")})</small>
                                            )}
                                        </Label>
                                        <Controller
                                            name="plan_price"
                                            control={control}
                                            render={({ field }) => (
                                                <div className={`input-group ${isPriceEditable() ? 'editable-input' : ''}`}>
                                                    <span className="input-group-text">{getCurrencySymbol()}</span>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        invalid={!!errors.plan_price}
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            setPlanPrice(parseFloat(e.target.value) || 0);
                                                        }}
                                                        disabled={!isPriceEditable()}
                                                    />
                                                </div>
                                            )}
                                        />
                                        <FormFeedback>{errors.plan_price?.message}</FormFeedback>
                                        {locationTiers.length > 0 && isPriceEditable() && (
                                            <small className="text-info">{t("Override price from location tier if needed")}</small>
                                        )}
                                    </div>

                                    {/* End Date - Super Admin can edit for all plan types */}
                                    <div className="mb-3 col-md-6">
                                        <Label for="end_date">
                                            {t("End Date")}
                                            <small className="text-success ms-1">({t("Editable")})</small>
                                            {islifetime && <small className="text-warning ms-1">({t("Lifetime Plan")})</small>}
                                        </Label>
                                        <div className="editable-field">
                                            <Controller
                                                name="end_date"
                                                control={control}
                                                render={({ field }) => (
                                                    <DateInput
                                                        value={field.value || ""}
                                                        id="end_date"
                                                        onChange={(dates, str, iso) => field.onChange(iso)}
                                                    />
                                                )}
                                            />
                                        </div>
                                        <FormFeedback>{errors.end_date?.message}</FormFeedback>
                                        <small className="text-muted">
                                            {islifetime ? t("Optional for lifetime plan") : t("Subscription expiry date")}
                                        </small>
                                    </div>

                                    {/* Next Billing Date - Super Admin can edit for all plan types */}
                                    <div className="mb-3 col-md-6">
                                        <Label for="next_billing_date">
                                            {t("Next Billing Date")}
                                            <small className="text-success ms-1">({t("Editable")})</small>
                                            {(islifetime || isTrialPlan) && <small className="text-warning ms-1">({islifetime ? t("Lifetime") : t("Trial")})</small>}
                                        </Label>
                                        <div className="editable-field">
                                            <Controller
                                                name="next_billing_date"
                                                control={control}
                                                render={({ field }) => (
                                                    <DateInput
                                                        value={field.value || ""}
                                                        id="next_billing_date"
                                                        onChange={(dates, str, iso) => field.onChange(iso)}
                                                    />
                                                )}
                                            />
                                        </div>
                                        <FormFeedback>{errors.next_billing_date?.message}</FormFeedback>
                                        <small className="text-muted">
                                            {(islifetime || isTrialPlan) ? t("Optional for this plan type") : t("Date when customer will be charged next")}
                                        </small>
                                    </div>

                                    {/* Status */}
                                    <div className="mb-3 col-md-6">
                                        <Label className="form-label">{t("Status")}</Label>
                                        <Controller
                                            name="status"
                                            control={control}
                                            render={({ field }) => (
                                                <div className="d-flex gap-3">
                                                    <div className="form-check">
                                                        <Input
                                                            type="radio"
                                                            id="active"
                                                            value="1"
                                                            checked={field.value === "1" || field.value === 1}
                                                            onChange={() => field.onChange(1)}
                                                        />
                                                        <Label className="form-check-label" for="active">
                                                            {t("Active")}
                                                        </Label>
                                                    </div>
                                                    <div className="form-check">
                                                        <Input
                                                            type="radio"
                                                            id="inactive"
                                                            value="0"
                                                            checked={field.value === "0" || field.value === 0}
                                                            onChange={() => field.onChange(0)}
                                                        />
                                                        <Label className="form-check-label" for="inactive">
                                                            {t("Inactive")}
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                        <FormFeedback className="d-block">{errors.status?.message}</FormFeedback>
                                    </div>
                                </Row>
                            </div>

                            {/* Discount Code Section */}
                            <div className="discount-section">
                                <div className="section-header">
                                    <h5>{t("Discount Code")}</h5>
                                    <p className="section-subtitle">{t("Apply a discount code to reduce pricing")}</p>
                                </div>

                                {!appliedDiscount ? (
                                    <div className="discount-input-wrapper">
                                        <Input
                                            type="text"
                                            placeholder={t("Enter discount code")}
                                            value={discountCode}
                                            onChange={(e) => setDiscountCode(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleApplyDiscount();
                                                }
                                            }}
                                        />
                                        <Button
                                            color="primary"
                                            onClick={handleApplyDiscount}
                                            disabled={discountLoading || !discountCode.trim()}
                                        >
                                            {discountLoading ? <Spinner size="sm" /> : t("Apply")}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="applied-discount-card" style={{
                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                        border: '1px solid #86efac',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        position: 'relative'
                                    }}>
                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={handleRemoveDiscount}
                                            title={t("Remove discount")}
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#6b7280',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                        >
                                            <X size={18} />
                                        </button>

                                        <div className="discount-details">
                                            {/* Discount Code & Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '1.5rem' }}>🎉</span>
                                                <div>
                                                    <span style={{
                                                        background: '#22c55e',
                                                        color: 'white',
                                                        padding: '4px 12px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {appliedDiscount.code}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Discount Value */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 0',
                                                borderBottom: '1px dashed #86efac'
                                            }}>
                                                <span style={{ color: '#166534', fontSize: '0.9rem' }}>
                                                    {appliedDiscount.discount_type === 'percentage'
                                                        ? t('{{value}}% discount', { value: appliedDiscount.discount_value })
                                                        : t('{{amount}} discount', { amount: formatPrice(appliedDiscount.discount_value) })
                                                    }
                                                </span>
                                                <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1.1rem' }}>
                                                    -{formatPrice(discountPrice)}
                                                </span>
                                            </div>

                                            {/* Duration Info */}
                                            <div style={{
                                                marginTop: '12px',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                backgroundColor: appliedDiscount.duration_type === 'forever'
                                                    ? '#dcfce7'
                                                    : appliedDiscount.duration_type === 'first_payment'
                                                        ? '#fef3c7'
                                                        : '#dbeafe',
                                                border: appliedDiscount.duration_type === 'forever'
                                                    ? '1px solid #86efac'
                                                    : appliedDiscount.duration_type === 'first_payment'
                                                        ? '1px solid #fcd34d'
                                                        : '1px solid #93c5fd'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '0.85rem',
                                                    color: appliedDiscount.duration_type === 'forever'
                                                        ? '#166534'
                                                        : appliedDiscount.duration_type === 'first_payment'
                                                            ? '#92400e'
                                                            : '#1e40af'
                                                }}>
                                                    <span>
                                                        {appliedDiscount.duration_type === 'forever' && '✓'}
                                                        {appliedDiscount.duration_type === 'first_payment' && '⚠️'}
                                                        {appliedDiscount.duration_type === 'limited_months' && '⏱️'}
                                                        {!appliedDiscount.duration_type && '✓'}
                                                    </span>
                                                    <span style={{ fontWeight: '500' }}>
                                                        {appliedDiscount.duration_type === 'forever' && t('Applies to all future payments')}
                                                        {appliedDiscount.duration_type === 'first_payment' && t('One-time discount - next payment at full price')}
                                                        {appliedDiscount.duration_type === 'limited_months' && t('Valid for {{count}} billing cycle(s)', { count: appliedDiscount.duration_months || 1 })}
                                                        {!appliedDiscount.duration_type && t('Discount applied successfully')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tools Selection Section */}
                            <div className="tools-section">
                                <div className="section-header">
                                    <h5>{t("Tools Selection")}</h5>
                                    <p className="section-subtitle">
                                        {t("All tools available in this plan. Select which tools to include in the subscription")}
                                        {isPriceEditable() && (
                                            <span className="text-success ms-2">({t("Prices are editable")})</span>
                                        )}
                                    </p>
                                </div>

                                {allCurrentTools.length > 0 ? (
                                    <div className="tools-grid">
                                        {allCurrentTools.map((tool) => {
                                            const isIncluded = isCurrentToolIncluded(tool._id);
                                            const calculatedPrice = calculateToolPrice(tool);
                                            const isMultiplier = tool.pricing_mode === 'multiplier';
                                            const isMandatory = tool.mandatory === true || tool.is_mandatory === true;
                                            const currentToolPrice = getCurrentToolPrice(tool._id);

                                            return (
                                                <div
                                                    key={tool._id}
                                                    className={`tool-card ${isIncluded ? 'selected' : 'available'} ${isMandatory ? 'mandatory' : ''}`}
                                                    onClick={() => handleCurrentToolToggle(tool._id, !isIncluded)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="tool-card-header">
                                                        <div className="tool-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                id={`current-tool-${tool._id}`}
                                                                checked={isIncluded}
                                                                onChange={() => {}}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <label htmlFor={`current-tool-${tool._id}`} onClick={(e) => e.preventDefault()}></label>
                                                        </div>
                                                        {isMandatory && (
                                                            <div className="mandatory-badge">
                                                                {t("Required")}
                                                            </div>
                                                        )}
                                                        {isIncluded && !isMandatory && (
                                                            <div className="selected-badge">
                                                                <Check size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="tool-card-body">
                                                        <h5 className="tool-name">{tool.name}</h5>
                                                        {tool.description && (
                                                            <p className="tool-description">{tool.description}</p>
                                                        )}
                                                        <div className="tool-price-info">
                                                            {isPriceEditable() ? (
                                                                <div className="tool-price-edit">
                                                                    <div className="input-group input-group-sm">
                                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={currentToolPrice}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCurrentToolPriceChange(tool._id, e.target.value);
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="form-control-sm tool-price-input"
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                    {isMultiplier && (
                                                                        <small className="text-info d-block mt-1">
                                                                            {t("Base")}: {formatPrice(tool.base_price || 0)} × {selectedLocations} {t("locations")}
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="tool-price">
                                                                        {formatPrice(calculatedPrice)}
                                                                    </div>
                                                                    {isMultiplier && selectedLocations > 1 && (
                                                                        <div className="tool-price-detail">
                                                                            <small className="text-muted">
                                                                                {formatPrice(tool.base_price || tool.price || 0)} × {selectedLocations} loc × {tool.location_multiplier}
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                            {isMultiplier && (
                                                                <span className="pricing-mode-badge">
                                                                    {t("Per Location")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="no-tools-message">
                                        {t("No tools available in this plan")}
                                    </div>
                                )}
                                <FormFeedback>{errors.tools?.message}</FormFeedback>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Payment Summary */}
                        <div className="col-xl-5 col-lg-5">
                            <div className="payment-summary-section">
                                <div className="payment-summary">
                                    <div className="summary-header">
                                        <div className="plan-badge">
                                            {store.planItem?.plan?.name || 'N/A'}
                                            {store.planItem?.recurring && <span className="recurring-badge">{t('Recurring')}</span>}
                                        </div>
                                        <h4 className="summary-title">{t('Payment Summary')}</h4>
                                    </div>

                                    <div className="summary-content">
                                        {/* Plan Price with Locations */}
                                        <div className="summary-section">
                                            <div className="summary-row">
                                                <span className="summary-label">
                                                    {store.planItem?.plan?.name || t('Plan')}
                                                    <small className={`ms-1 ${isCustomLocation ? 'text-success fw-bold' : 'text-muted'}`}>
                                                        ({selectedLocations} {selectedLocations === 1 ? t('Location') : t('Locations')})
                                                        {isCustomLocation && <span className="ms-1">- {t('Custom')}</span>}
                                                    </small>
                                                </span>
                                                <span className="summary-value">{formatPrice(planPrice)}</span>
                                            </div>
                                        </div>

                                        {/* Selected Tools */}
                                        {selectedToolsData.length > 0 && (
                                            <div className="summary-section">
                                                <h5 className="section-title">{t('Selected Tools')}</h5>
                                                {selectedToolsData.map((tool) => {
                                                    // Use the current tool.price (which may have been edited by admin)
                                                    const toolPrice = parseFloat(tool.price) || 0;
                                                    const isMultiplier = tool.pricing_mode === 'multiplier';
                                                    return (
                                                        <div key={tool._id} className="summary-row tool-row">
                                                            <span className="summary-label">
                                                                <span className="tool-icon">✓</span>
                                                                {tool.name}
                                                                {isMultiplier && (
                                                                    <small className="text-muted ms-1">(×{selectedLocations})</small>
                                                                )}
                                                            </span>
                                                            <span className="summary-value">
                                                                {formatPrice(toolPrice)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Subtotals */}
                                        <div className="summary-section">
                                            <div className="summary-row">
                                                <span className="summary-label">{t('Tools Subtotal')}</span>
                                                <span className="summary-value">{formatPrice(toolsTotal)}</span>
                                            </div>

                                            <div className="summary-row">
                                                <span className="summary-label">{t('Subtotal')}</span>
                                                <span className="summary-value">{formatPrice(subtotal)}</span>
                                            </div>

                                            {/* Discount Details Card */}
                                            {appliedDiscount && discountPrice > 0 && (
                                                <div
                                                    className="discount-details-card"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                                        border: '1px solid #86efac',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        marginTop: '12px',
                                                        marginBottom: '12px'
                                                    }}
                                                >
                                                    {/* Discount Header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '1.2rem' }}>🎉</span>
                                                            <span style={{ fontWeight: '600', color: '#166534', fontSize: '0.95rem' }}>
                                                                {t('Discount Applied')}
                                                            </span>
                                                        </div>
                                                        <span style={{
                                                            background: '#22c55e',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {appliedDiscount.code}
                                                        </span>
                                                    </div>

                                                    {/* Discount Value Info */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 0',
                                                        borderBottom: '1px dashed #86efac'
                                                    }}>
                                                        <span style={{ color: '#166534', fontSize: '0.85rem' }}>
                                                            {appliedDiscount.discount_type === 'percentage'
                                                                ? t('{{value}}% off your subscription', { value: appliedDiscount.discount_value })
                                                                : t('{{amount}} off your subscription', { amount: formatPrice(appliedDiscount.discount_value) })
                                                            }
                                                        </span>
                                                        <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>
                                                            -{formatPrice(discountPrice)}
                                                        </span>
                                                    </div>

                                                    {/* Duration Info Box */}
                                                    {appliedDiscount.duration_type && (
                                                        <div style={{
                                                            marginTop: '10px',
                                                            padding: '10px',
                                                            borderRadius: '6px',
                                                            backgroundColor: appliedDiscount.duration_type === 'forever'
                                                                ? '#dcfce7'
                                                                : appliedDiscount.duration_type === 'first_payment'
                                                                    ? '#fef3c7'
                                                                    : '#dbeafe',
                                                            border: appliedDiscount.duration_type === 'forever'
                                                                ? '1px solid #86efac'
                                                                : appliedDiscount.duration_type === 'first_payment'
                                                                    ? '1px solid #fcd34d'
                                                                    : '1px solid #93c5fd'
                                                        }}>
                                                            {/* Duration Type Icon & Message */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '8px',
                                                                color: appliedDiscount.duration_type === 'forever'
                                                                    ? '#166534'
                                                                    : appliedDiscount.duration_type === 'first_payment'
                                                                        ? '#92400e'
                                                                        : '#1e40af',
                                                                fontSize: '0.85rem'
                                                            }}>
                                                                <span style={{ flexShrink: 0, marginTop: '1px' }}>
                                                                    {appliedDiscount.duration_type === 'forever' && '✓'}
                                                                    {appliedDiscount.duration_type === 'first_payment' && '⚠️'}
                                                                    {appliedDiscount.duration_type === 'limited_months' && '⏱️'}
                                                                </span>
                                                                <div>
                                                                    {appliedDiscount.duration_type === 'forever' && (
                                                                        <strong>{t('Lifetime Discount')}</strong>
                                                                    )}
                                                                    {appliedDiscount.duration_type === 'first_payment' && (
                                                                        <strong>{t('One-Time Discount')}</strong>
                                                                    )}
                                                                    {appliedDiscount.duration_type === 'limited_months' && (
                                                                        <strong>{t('Limited Time Discount')}</strong>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Detailed Message */}
                                                            <div style={{
                                                                marginTop: '6px',
                                                                paddingLeft: '22px',
                                                                fontSize: '0.8rem',
                                                                color: appliedDiscount.duration_type === 'forever'
                                                                    ? '#15803d'
                                                                    : appliedDiscount.duration_type === 'first_payment'
                                                                        ? '#a16207'
                                                                        : '#1d4ed8',
                                                                lineHeight: '1.4'
                                                            }}>
                                                                {appliedDiscount.duration_type === 'forever' && (
                                                                    <span>{t('This discount will be applied to all future billing cycles automatically.')}</span>
                                                                )}
                                                                {appliedDiscount.duration_type === 'first_payment' && (
                                                                    <>
                                                                        <span>{t('This discount applies to this payment only.')}</span>
                                                                        <div style={{ marginTop: '6px', fontWeight: '500' }}>
                                                                            {t('Future charges')}: {formatPrice(subtotal)} + {t('tax')}
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {appliedDiscount.duration_type === 'limited_months' && (
                                                                    <>
                                                                        <span>
                                                                            {appliedDiscount.remaining_months
                                                                                ? t('{{remaining}} of {{total}} discounted cycles remaining.', {
                                                                                    remaining: appliedDiscount.remaining_months,
                                                                                    total: appliedDiscount.duration_months || appliedDiscount.remaining_months
                                                                                  })
                                                                                : t('Discounted price for {{count}} billing cycle(s).', { count: appliedDiscount.duration_months || 1 })
                                                                            }
                                                                        </span>
                                                                        <div style={{ marginTop: '6px', fontWeight: '500' }}>
                                                                            {t('After discount expires')}: {formatPrice(subtotal)} + {t('tax')}/{t('cycle')}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Location Rules Info Box */}
                                                    {appliedDiscount.location_rules && appliedDiscount.location_rules.length > 0 && (() => {
                                                        const locationRulesText = formatLocationRules(appliedDiscount.location_rules, t);
                                                        if (!locationRulesText) return null;
                                                        return (
                                                            <div style={{
                                                                marginTop: '10px',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                backgroundColor: '#f3e8ff',
                                                                border: '1px solid #c4b5fd'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    gap: '8px',
                                                                    color: '#6b21a8',
                                                                    fontSize: '0.85rem'
                                                                }}>
                                                                    <span style={{ flexShrink: 0, marginTop: '1px' }}>📍</span>
                                                                    <div>
                                                                        <strong>{t('Location Requirement')}</strong>
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    marginTop: '6px',
                                                                    paddingLeft: '22px',
                                                                    fontSize: '0.8rem',
                                                                    color: '#7c3aed',
                                                                    lineHeight: '1.4'
                                                                }}>
                                                                    <span>{t('This discount applies to')}: {locationRulesText}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* After Discount */}
                                            {discountPrice > 0 && (
                                                <div className="summary-row">
                                                    <span className="summary-label">{t('After Discount')}</span>
                                                    <span className="summary-value">{formatPrice(subtotalAfterDiscount)}</span>
                                                </div>
                                            )}

                                            {/* Tax */}
                                            {taxPercentage > 0 && (
                                                <div className="summary-row">
                                                    <span className="summary-label">
                                                        {store.planItem?.tax_info?.label || store.planItem?.tax_label || defaultTaxLabel} ({taxPercentage}%)
                                                    </span>
                                                    <span className="summary-value">{formatPrice(taxValue)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Total */}
                                        <div className="summary-section total-section">
                                            <div className="summary-row total-row">
                                                <span className="summary-label">{t('Total')}</span>
                                                <span className="summary-value total-amount">
                                                    {formatPrice(finalPrice)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info Notice */}
                                        <div className="summary-footer">
                                            <div className="info-item">
                                                <span className="info-icon">ℹ️</span>
                                                <span className="info-text">
                                                    {t('Changes will be reflected in your next billing cycle')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Security Notice */}
                                        <div className="security-notice">
                                            <div className="security-icon">🔒</div>
                                            <div className="security-text">
                                                <strong>{t('Secure Payment')}</strong>
                                                <br />
                                                {t('Your payment is protected by industry-standard encryption')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Debug: Show form errors */}
                    {Object.keys(errors).length > 0 && (
                        <div className="alert alert-danger mb-3 mt-3">
                            <strong>Form Validation Errors:</strong>
                            <ul className="mb-0 mt-1">
                                {Object.entries(errors).map(([field, error]) => (
                                    <li key={field}>{field}: {error?.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="form-actions">
                        <Button type="button" color="secondary" onClick={handleCancel}>
                            {t("Cancel")}
                        </Button>
                        <Button type="submit" color="primary" disabled={store?.loading}>
                            {store?.loading ? (
                                <>
                                    <Spinner size="sm" className="me-50" />
                                    {t("Saving...")}
                                </>
                            ) : (
                                t("Save Changes")
                            )}
                        </Button>
                    </div>
                </Form>
            </div>
        </Fragment >
    );
};

export default SubscriptionForm;
