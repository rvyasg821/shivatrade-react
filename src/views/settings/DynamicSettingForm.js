// src/views/settings/DynamicSettingForm.js
import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Card,
  CardBody
} from "reactstrap";
import { useDispatch } from "react-redux";
import { updateSetting, getSettingList } from "./store";
import settingsConfig from "./settingsConfig";

// ✅ import the same toggle used in Login
import InputPasswordToggle from "@components/input-password-toggle";

const DynamicSettingForm = ({ group, values }) => {
  const [formData, setFormData] = useState({});
  const dispatch = useDispatch();

  // Load default fields from config + pre-fill with API values
  useEffect(() => {
    let baseFormData = {};
    (settingsConfig[group] || []).forEach((field) => {
      if (field.type === "boolean") {
        baseFormData[field.name] = values?.[field.name] ?? false;
      } else {
        baseFormData[field.name] = values?.[field.name] || "";
      }
    });
    setFormData(baseFormData);
  }, [group, values]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "select-one" && (value === "true" || value === "false")
        ? value === "true"
        : value;

    setFormData({
      ...formData,
      [name]: newValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      description: values?.description || `${group} configuration`,
      value: {
        ...formData,
        enabled: formData.enabled ?? false
      }
    };

    console.log("🚀 Submit payload:", payload);

    const res = await dispatch(updateSetting({ key: group, payload }));
    if (!res.error) {
      dispatch(getSettingList());
    }
  };

  const fields = settingsConfig[group] || [];

  // Split fields into pairs (2 per row)
  const fieldPairs = [];
  for (let i = 0; i < fields.length; i += 2) {
    fieldPairs.push(fields.slice(i, i + 2));
  }

  return (
    <Card>
      <CardBody>
        <Form onSubmit={handleSubmit}>
          {fieldPairs.map((pair, idx) => (
            <Row key={idx}>
              {pair.map((field) => (
                <Col md={6} className="" key={field.name}>
                  <FormGroup>
                    <Label for={field.name}>{field.label}</Label>

                    {field.type === "boolean" ? (
                      <Input
                        type="select"
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                      >
                        <option value={true}>Enabled</option>
                        <option value={false}>Disabled</option>
                      </Input>
                    ) : field.type === "select" ? (
                      <Input
                        type="select"
                        id={field.name}
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Input>
                    ) : field.type === "password" ? (
                      // ✅ Eye toggle field
                      <InputPasswordToggle
                        id={field.name}
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                        className="input-group-merge"
                      />
                    ) : (
                      <Input
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                      />
                    )}
                  </FormGroup>
                </Col>
              ))}
            </Row>
          ))}
  <div className="ps-2">
          <Button color="dark" type="submit">
            Save
          </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  );
};

export default DynamicSettingForm;
