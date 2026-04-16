// ** React Imports
import { useState, useEffect } from "react";

// ** Reactstrap Imports
import {
    Table,
    Label,
    Input,
    FormFeedback,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Utils
import { formatPrice } from "@src/utility/Utils";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const ToolsSelector = ({
    availableTools = [],
    selectedTools = [],
    onChange,
    errors = {}
}) => {
    const { t } = useTranslation();
    const { getCurrencySymbol } = useCurrency();
    const [localSelectedTools, setLocalSelectedTools] = useState(selectedTools);

    useEffect(() => {
        setLocalSelectedTools(selectedTools);
    }, [selectedTools]);

    const handleToolSelection = (tool, isSelected) => {
        let updatedTools = [...localSelectedTools];

        if (isSelected) {
            // Add tool with default pricing fields
            updatedTools.push({
                _id: tool._id,
                name: tool.name,
                slug: tool.slug,
                price: 0,
                pricing_mode: 'fixed', // 'fixed' or 'multiplier'
                location_multiplier: 1.0,
                is_mandatory: false
            });
        } else {
            // Remove tool
            updatedTools = updatedTools.filter(t => t._id !== tool._id);
        }

        setLocalSelectedTools(updatedTools);
        onChange(updatedTools);
    };

    const handlePriceChange = (toolId, value) => {
        // Allow typing intermediate values (like "0." or "10.") by storing as string temporarily
        let storedValue;
        if (value === "" || value === null || value === undefined) {
            storedValue = 0;
        } else if (typeof value === 'string' && value.endsWith('.')) {
            // Keep as string to allow typing decimal numbers smoothly
            storedValue = value;
        } else {
            const parsed = parseFloat(value);
            storedValue = isNaN(parsed) ? 0 : parsed;
        }

        const updatedTools = localSelectedTools.map(tool =>
            tool._id === toolId
                ? { ...tool, price: storedValue }
                : tool
        );

        setLocalSelectedTools(updatedTools);
        onChange(updatedTools);
    };

    const handlePricingModeChange = (toolId, mode) => {
        const updatedTools = localSelectedTools.map(tool =>
            tool._id === toolId
                ? { ...tool, pricing_mode: mode }
                : tool
        );

        setLocalSelectedTools(updatedTools);
        onChange(updatedTools);
    };

    const handleLocationMultiplierChange = (toolId, value) => {
        // Allow typing intermediate values (like "0." or "1.") by storing as string temporarily
        // Only convert to number when it's a complete valid number
        let storedValue;
        if (value === "" || value === null || value === undefined) {
            storedValue = 1.0;
        } else if (typeof value === 'string' && (value.endsWith('.') || value === '0' || value === '0.')) {
            // Keep as string to allow typing decimal numbers smoothly
            storedValue = value;
        } else {
            const parsed = parseFloat(value);
            storedValue = isNaN(parsed) ? 1.0 : parsed;
        }

        const updatedTools = localSelectedTools.map(tool =>
            tool._id === toolId
                ? { ...tool, location_multiplier: storedValue }
                : tool
        );

        setLocalSelectedTools(updatedTools);
        onChange(updatedTools);
    };

    const isToolSelected = (toolId) => {
        return localSelectedTools.some(tool => tool._id === toolId);
    };

    const getToolPrice = (toolId) => {
        const tool = localSelectedTools.find(tool => tool._id === toolId);
        // Return 0 explicitly if price is 0, undefined, null, or empty string
        const price = tool?.price;
        return price !== undefined && price !== null && price !== '' ? price : 0;
    };

    const getToolPricingMode = (toolId) => {
        const tool = localSelectedTools.find(tool => tool._id === toolId);
        return tool?.pricing_mode || 'fixed';
    };

    const getToolLocationMultiplier = (toolId) => {
        const tool = localSelectedTools.find(tool => tool._id === toolId);
        return tool?.location_multiplier !== undefined ? tool.location_multiplier : 1.0;
    };

    const handleMandatoryChange = (toolId, isMandatory) => {
        const updatedTools = localSelectedTools.map(tool =>
            tool._id === toolId
                ? { ...tool, is_mandatory: isMandatory }
                : tool
        );

        setLocalSelectedTools(updatedTools);
        onChange(updatedTools);
    };

    const getToolMandatory = (toolId) => {
        const tool = localSelectedTools.find(tool => tool._id === toolId);
        return tool ? Boolean(tool.is_mandatory) : false;
    };

    return (
        <div className="tools-selector custome-table">
            <Label className="form-label mb-2">
                <strong>{t("Tools")}</strong>
            </Label>

            {availableTools.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-muted">{t("No tools available")}</p>
                </div>
            ) : (
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>{t("Select")}</th>
                            <th>{t("Tool Name")}</th>
                            <th style={{ width: '100px' }}>{t("Mandatory")}</th>
                            <th style={{ width: '150px' }}>{t("Price")} ({getCurrencySymbol()})</th>
                            <th style={{ width: '160px' }}>{t("Pricing Mode")}</th>
                            <th style={{ width: '120px' }}>{t("Multiplier")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...availableTools].sort((a, b) => {
                            // Sort by displayOrder first, then by name as fallback
                            const orderA = a.displayOrder ?? 999;
                            const orderB = b.displayOrder ?? 999;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        }).map((tool) => {
                            const isSelected = isToolSelected(tool._id);
                            const toolPrice = getToolPrice(tool._id);
                            const pricingMode = getToolPricingMode(tool._id);
                            const locationMultiplier = getToolLocationMultiplier(tool._id);
                            const isMandatory = getToolMandatory(tool._id);

                            return (
                                <tr key={tool._id} className={isSelected ? 'table-active' : ''}>
                                    <td className="text-center">
                                        <Input
                                            type="checkbox"
                                            id={`tool-${tool._id}`}
                                            checked={isSelected}
                                            onChange={(e) => handleToolSelection(tool, e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>
                                        <Label
                                            for={`tool-${tool._id}`}
                                            className="mb-0 fw-medium"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {tool.name}
                                        </Label>
                                    </td>
                                    <td className="text-center">
                                        <Input
                                            type="checkbox"
                                            id={`mandatory-${tool._id}`}
                                            checked={isMandatory}
                                            onChange={(e) => handleMandatoryChange(tool._id, e.target.checked)}
                                            disabled={!isSelected}
                                            style={{
                                                cursor: !isSelected ? 'not-allowed' : 'pointer'
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={toolPrice}
                                            onChange={(e) => handlePriceChange(tool._id, e.target.value)}
                                            placeholder="0.00"
                                            disabled={!isSelected}
                                            invalid={errors[`tool_${tool._id}_price`] ? true : false}
                                            style={{
                                                backgroundColor: !isSelected ? '#f8f9fa' : 'white',
                                                cursor: !isSelected ? 'not-allowed' : 'text'
                                            }}
                                        />
                                        {errors[`tool_${tool._id}_price`] && (
                                            <FormFeedback className="d-block">
                                                {typeof errors[`tool_${tool._id}_price`] === 'object'
                                                    ? errors[`tool_${tool._id}_price`]?.message || 'Invalid price'
                                                    : errors[`tool_${tool._id}_price`]
                                                }
                                            </FormFeedback>
                                        )}
                                    </td>
                                    <td>
                                        <Input
                                            type="select"
                                            value={pricingMode}
                                            onChange={(e) => handlePricingModeChange(tool._id, e.target.value)}
                                            disabled={!isSelected}
                                            style={{
                                                backgroundColor: !isSelected ? '#f8f9fa' : 'white',
                                                cursor: !isSelected ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            <option value="fixed">{t("Fixed")}</option>
                                            <option value="multiplier">{t("Multiplier")}</option>
                                        </Input>
                                    </td>
                                    <td>
                                        <Input
                                            type="number"
                                            min="0.1"
                                            max="10.0"
                                            step="0.1"
                                            value={locationMultiplier}
                                            onChange={(e) => handleLocationMultiplierChange(tool._id, e.target.value)}
                                            placeholder="1.0"
                                            disabled={!isSelected || pricingMode === 'fixed'}
                                            invalid={errors[`tool_${tool._id}_multiplier`] ? true : false}
                                            title={pricingMode === 'fixed' ? t("Only used in Multiplier mode") : t("Price multiplier per location")}
                                            style={{
                                                backgroundColor: (!isSelected || pricingMode === 'fixed') ? '#f8f9fa' : 'white',
                                                cursor: (!isSelected || pricingMode === 'fixed') ? 'not-allowed' : 'text'
                                            }}
                                        />
                                        {errors[`tool_${tool._id}_multiplier`] && (
                                            <FormFeedback className="d-block">
                                                {typeof errors[`tool_${tool._id}_multiplier`] === 'object'
                                                    ? errors[`tool_${tool._id}_multiplier`]?.message || 'Invalid multiplier'
                                                    : errors[`tool_${tool._id}_multiplier`]
                                                }
                                            </FormFeedback>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            )}

            {errors.tools && (
                <FormFeedback className="d-block mt-2">
                    {typeof errors.tools === 'object'
                        ? errors.tools?.message || 'Tools validation error'
                        : errors.tools
                    }
                </FormFeedback>
            )}

            {localSelectedTools.length > 0 && (
                <div className="mt-2">
                    <small className="text-muted">
                        {t("Selected")} {localSelectedTools.length} {t("tools")}
                    </small>
                    <div className="mt-1">
                        <small className="text-success">
                            {t("Total price")}: {formatPrice(
                                localSelectedTools.reduce((total, tool) => total + (parseFloat(tool.price) || 0), 0)
                            )}
                        </small>
                    </div>
                    <div className="mt-1">
                        <small className="text-info">
                            💡 <strong>{t("Pricing Modes")}:</strong> {t("Fixed = same price for all locations")} | {t("Multiplier = price scales with locations")}
                        </small>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ToolsSelector;