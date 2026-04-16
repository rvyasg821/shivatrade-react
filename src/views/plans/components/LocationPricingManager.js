// ** React Imports
import { useState, useEffect } from "react";

// ** Reactstrap Imports
import {
    Table,
    Label,
    Input,
    Button,
    FormFeedback,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "react-feather";

// ** Utils
import { formatPrice } from "@src/utility/Utils";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const LocationPricingManager = ({
    locationPricing = [],
    onChange,
    errors = {}
}) => {
    const { t } = useTranslation();
    const { getCurrencySymbol } = useCurrency();
    const [tiers, setTiers] = useState(locationPricing.length > 0 ? locationPricing : [
        { locations: 1, price: 0, special_price: 0, special_price_duration: 0, platform_fee: 0 }
    ]);

    useEffect(() => {
        if (locationPricing.length > 0) {
            setTiers(locationPricing);
        }
    }, [locationPricing]);

    const handleAddTier = () => {
        const lastTier = tiers[tiers.length - 1];
        const newLocations = lastTier ? lastTier.locations + 1 : 1;

        const newTier = {
            locations: newLocations,
            price: 0,
            special_price: 0,
            special_price_duration: 0,
            platform_fee: 0
        };

        const updatedTiers = [...tiers, newTier];
        setTiers(updatedTiers);
        onChange(updatedTiers);
    };

    const handleRemoveTier = (index) => {
        if (tiers.length <= 1) {
            // Keep at least one tier
            return;
        }

        const updatedTiers = tiers.filter((_, i) => i !== index);
        setTiers(updatedTiers);
        onChange(updatedTiers);
    };

    const handleTierChange = (index, field, value) => {
        let processedValue = value;

        // Handle numeric fields to allow smooth typing
        if (field === 'price' || field === 'special_price') {
            if (value === "" || value === null || value === undefined) {
                processedValue = 0;
            } else if (typeof value === 'string' && value.endsWith('.')) {
                // Keep as string to allow typing decimal numbers smoothly
                processedValue = value;
            } else {
                const parsed = parseFloat(value);
                processedValue = isNaN(parsed) ? 0 : parsed;
            }
        }

        const updatedTiers = tiers.map((tier, i) => {
            if (i === index) {
                return { ...tier, [field]: processedValue };
            }
            return tier;
        });

        setTiers(updatedTiers);
        onChange(updatedTiers);
    };

    const sortTiersByLocations = () => {
        const sorted = [...tiers].sort((a, b) => a.locations - b.locations);
        setTiers(sorted);
        onChange(sorted);
    };

    return (
        <div className="location-pricing-manager custome-table">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <Label className="form-label mb-0">
                    <strong>{t("Location-Based Pricing")}</strong>
                    <small className="text-muted d-block">{t("Define pricing tiers for different numbers of locations")}</small>
                </Label>
                <div>
                    <Button
                        color="primary"
                        size="sm"
                        onClick={handleAddTier}
                        className="me-1"
                    >
                        <Plus size={14} className="me-50" />
                        {t("Add Tier")}
                    </Button>
                    <Button
                        color="secondary"
                        size="sm"
                        outline
                        onClick={sortTiersByLocations}
                    >
                        {t("Sort")}
                    </Button>
                </div>
            </div>

            <Table responsive hover className="mb-2">
                <thead>
                    <tr>
                        <th style={{ width: '150px' }}>{t("Locations")} <span className="text-danger">*</span></th>
                        <th style={{ width: '200px' }}>{t("Price")} ({getCurrencySymbol()}) <span className="text-danger">*</span></th>
                        <th style={{ width: '200px' }}>{t("Special Price")} ({getCurrencySymbol()})</th>
                        <th style={{ width: '100px' }} className="text-center">{t("Actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {tiers.map((tier, index) => (
                        <tr key={index}>
                            <td>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={tier.locations || ''}
                                    onChange={(e) => handleTierChange(index, 'locations', parseInt(e.target.value) || '')}
                                    placeholder="1"
                                    invalid={errors[`location_pricing_${index}_locations`] ? true : false}
                                />
                                {errors[`location_pricing_${index}_locations`] && (
                                    <FormFeedback className="d-block">
                                        {errors[`location_pricing_${index}_locations`]?.message || 'Invalid'}
                                    </FormFeedback>
                                )}
                            </td>
                            <td>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={tier.price !== null && tier.price !== undefined && tier.price !== '' ? tier.price : 0}
                                    onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                    placeholder="0.00"
                                    invalid={errors[`location_pricing_${index}_price`] ? true : false}
                                />
                                {errors[`location_pricing_${index}_price`] && (
                                    <FormFeedback className="d-block">
                                        {errors[`location_pricing_${index}_price`]?.message || 'Invalid'}
                                    </FormFeedback>
                                )}
                            </td>
                            <td>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={tier.special_price !== null && tier.special_price !== undefined && tier.special_price !== '' ? tier.special_price : 0}
                                    onChange={(e) => handleTierChange(index, 'special_price', e.target.value)}
                                    placeholder="0.00"
                                    invalid={errors[`location_pricing_${index}_special_price`] ? true : false}
                                />
                                {errors[`location_pricing_${index}_special_price`] && (
                                    <FormFeedback className="d-block">
                                        {errors[`location_pricing_${index}_special_price`]?.message || 'Invalid'}
                                    </FormFeedback>
                                )}
                            </td>
                            <td className="text-center">
                                <Button
                                    color="danger"
                                    size="sm"
                                    outline
                                    onClick={() => handleRemoveTier(index)}
                                    disabled={tiers.length <= 1}
                                    title={tiers.length <= 1 ? t("At least one tier required") : t("Remove tier")}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {errors.location_pricing && (
                <FormFeedback className="d-block mt-2">
                    {typeof errors.location_pricing === 'object'
                        ? errors.location_pricing?.message || 'Location pricing validation error'
                        : errors.location_pricing
                    }
                </FormFeedback>
            )}

            {tiers.length > 0 && (
                <div className="mt-2">
                    <small className="text-muted">
                        {t("Configured")} {tiers.length} {t("pricing tier(s)")}
                    </small>
                    <div className="mt-1">
                        <small className="text-info">
                            💡 {t("Tip")}: {t("Price is used by default. If special price is set and greater than 0, it will be used instead.")}
                        </small>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPricingManager;
