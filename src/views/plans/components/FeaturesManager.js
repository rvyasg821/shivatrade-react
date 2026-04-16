// ** React Imports
import { useState, useEffect } from "react";

// ** Reactstrap Imports
import {
    Row,
    Col,
    Label,
    Input,
    Button,
    FormFeedback,
} from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Import
import { Plus, X } from "react-feather";

const FeaturesManager = ({
    features = [""],
    onChange,
    errors = {}
}) => {
    const { t } = useTranslation();
    const [localFeatures, setLocalFeatures] = useState(features);

    useEffect(() => {
        // Ensure we always have at least one empty feature
        if (features.length === 0) {
            setLocalFeatures([""]);
        } else {
            setLocalFeatures(features);
        }
    }, [features]);

    const handleFeatureChange = (index, value) => {
        const updatedFeatures = [...localFeatures];
        updatedFeatures[index] = value;
        setLocalFeatures(updatedFeatures);

        // Pass all features to parent, including empty ones for proper form state management
        onChange(updatedFeatures);
    };

    const addFeature = () => {
        const updatedFeatures = [...localFeatures, ""];
        setLocalFeatures(updatedFeatures);
        onChange(updatedFeatures);
    };

    const removeFeature = (index) => {
        if (localFeatures.length > 1) {
            const updatedFeatures = localFeatures.filter((_, i) => i !== index);
            setLocalFeatures(updatedFeatures);
            onChange(updatedFeatures);
        }
    };

    const canRemoveFeature = (index) => {
        return localFeatures.length > 1;
    };

    return (
        <div className="features-manager">
            <div className="d-flex align-items-center justify-content-between mb-2">
                <Label className="form-label mb-0">
                    <strong>{t("Plan Features")}</strong>
                </Label>
                <Button
                    type="button"
                    color="primary"
                    size="sm"
                    onClick={addFeature}
                    className="d-flex align-items-center"
                >
                    <Plus size={14} className="me-1" />
                    {t("Add Feature")}
                </Button>
            </div>

            {localFeatures.map((feature, index) => (
                <Row key={index} className="mb-2 align-items-center">
                    <Col xs="9" sm="11">
                        <Input
                            type="text"
                            value={feature}
                            onChange={(e) => handleFeatureChange(index, e.target.value)}
                            placeholder={t("Enter feature description")}
                            invalid={errors[`feature_${index}`] ? true : false}
                        />
                        {errors[`feature_${index}`] && (
                            <FormFeedback>
                                {errors[`feature_${index}`]?.message || errors[`feature_${index}`]}
                            </FormFeedback>
                        )}
                    </Col>
                    <Col xs="3" sm="1" className="d-flex justify-content-end">
                        {canRemoveFeature(index) && (
                            <Button
                                type="button"
                                color="danger"
                                size="sm"
                                onClick={() => removeFeature(index)}
                                className="d-flex align-items-center"
                            >
                                <X size={14} />
                            </Button>
                        )}
                    </Col>
                </Row>
            ))}

            {errors.features && (
                <FormFeedback className="d-block mt-2">
                    {errors.features?.message || errors.features}
                </FormFeedback>
            )}

            <div className="mt-1 p-2 bg-light rounded">
                <h6 className="mb-1">{t("Features Preview")}</h6>
                {localFeatures.filter(f => f.trim() !== "").length === 0 ? (
                    <p className="text-muted small mb-0">{t("No features added yet")}</p>
                ) : (
                    <ul className="mb-0">
                        {localFeatures
                            .filter(feature => feature.trim() !== "")
                            .map((feature, index) => (
                                <li key={index} className="small">
                                    {feature}
                                </li>
                            ))}
                    </ul>
                )}
            </div>

        </div>
    );
};

export default FeaturesManager;