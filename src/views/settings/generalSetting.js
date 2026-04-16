// ** React Imports
import { Fragment } from "react";

// ** Reactstrap Imports
import {
  Row,
  Card,
  Form,
  Label,
  Input,
  Button,
  CardBody,
  FormFeedback,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** i18n
import { useTranslation } from "react-i18next";

const GeneralSetting = () => {
  const { t } = useTranslation();

  /* Yup validation schema */
  const GeneralSchema = yup.object().shape({
    name: yup.string().required(`${t("Name is required")}.`),
    slug: yup.string().required(`${t("Slug is required")}.`),
    group_name: yup.string().required(`${t("Group name is required")}.`),
    value: yup.string().required(`${t("Value is required")}.`),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    resolver: yupResolver(GeneralSchema),
  });

  const onSubmit = (values) => {
    if (values) {
      const generalData = {
        name: values?.name || "",
        slug: values?.slug || "",
        group_name: values?.group_name || "",
        value: values?.value || "",
      };

      console.log("Submitted Data >>> ", generalData);
    }
  };

  return (
    <Fragment>
      <div className="main-content">
        <Card>
          <CardBody>
            <Row>
              <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                <Row>
                  {/* Name */}
                  <div className="mb-2 col-lg-12 col-md-12 col-sm-12">
                    <Label className="form-label" for="name">
                      {t("Name")}
                    </Label>
                    <Controller
                      id="name"
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          autoComplete="off"
                          invalid={!!errors.name}
                        />
                      )}
                    />
                    <FormFeedback>{errors.name?.message}</FormFeedback>
                  </div>

                  {/* Slug */}
                  <div className="mb-2 col-lg-12 col-md-12 col-sm-12">
                    <Label className="form-label" for="slug">
                      {t("Slug")}
                    </Label>
                    <Controller
                      id="slug"
                      name="slug"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          autoComplete="off"
                          invalid={!!errors.slug}
                        />
                      )}
                    />
                    <FormFeedback>{errors.slug?.message}</FormFeedback>
                  </div>

                  {/* Group Name */}
                  <div className="mb-2 col-lg-12 col-md-12 col-sm-12">
                    <Label className="form-label" for="group_name">
                      {t("Group Name")}
                    </Label>
                    <Controller
                      id="group_name"
                      name="group_name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          autoComplete="off"
                          invalid={!!errors.group_name}
                        />
                      )}
                    />
                    <FormFeedback>{errors.group_name?.message}</FormFeedback>
                  </div>

                  {/* Value */}
                  <div className="mb-2 col-lg-12 col-md-12 col-sm-12">
                    <Label className="form-label" for="value">
                      {t("Value")}
                    </Label>
                    <Controller
                      id="value"
                      name="value"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          autoComplete="off"
                          invalid={!!errors.value}
                        />
                      )}
                    />
                    <FormFeedback>{errors.value?.message}</FormFeedback>
                  </div>
                </Row>

                <div className="mt-2">
                  <Button type="submit" color="primary">
                    {t("Save")}
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

export default GeneralSetting;
