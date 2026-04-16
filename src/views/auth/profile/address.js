// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getCompanyDetails, updateCompanyProfile } from "./editCompany/store";
import { appsRoot } from "@constant/defaultValues";

// ** Reactstrap Imports
import { Row, Form, Label, Card, CardBody, Input, Button, Spinner, FormFeedback } from "reactstrap";

// ** Third Party Components
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
// ** Custom Components
import Notification from "@components/toast/notification";
import { useParams } from "react-router-dom";
import { startLoading, stopLoading } from "../../loadingstore";

const Address = ({ onCompanyUpdated, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.company);
  const { id } = useParams();
  const navigate = useNavigate();
  // ✅ Validation schema
  const AddressSchema = yup.object().shape({
    address_1: yup.string().required(`${t("Address Line 1 is required")}.`),
    address_2: yup.string().nullable(),
    state: yup.string().nullable(),
    city: yup.string().nullable(),
    country: yup.string().nullable(),
    zipcode: yup.string().nullable(),
  });

  // ✅ Form setup
  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    shouldFocusError: false,
    defaultValues: {
      address_1: "",
      address_2: "",
      state: "",
      city: "",
      country: "",
      zipcode: "",
    },
    resolver: yupResolver(AddressSchema),
  });
  useEffect(() => {
    if (id) {
      dispatch(getCompanyDetails(id));
    }
  }, [dispatch, id]);
  // ✅ Populate form with existing data from authUserItem
  useEffect(() => {
    if (store?.companyItem) {
      reset({
        address_1: store.companyItem.address_1 || "",
        address_2: store.companyItem.address_2 || "",
        state: store.companyItem.state || "",
        city: store.companyItem.city || "",
        country: store.companyItem.country || "",
        zipcode: store.companyItem.zipcode || "",
      });
    }
  }, [store?.companyItem, reset]);

  // ✅ Submit form
  const onSubmit = async (values) => {

    const payload = {
      address_1: values.address_1,
      address_2: values.address_2,
      state: values.state,
      city: values.city,
      country: values.country,
      zipcode: values.zipcode,
    };

    try {
      const result = await dispatch(updateCompanyProfile(payload)).unwrap();

      if (result?.actionFlag === "UPDATE_COMPANY_SCS") {
        Notification("Success", "Address updated successfully", "success");
        console.log("updateresult", result)
        // ✅ Redirect to profile page
        navigate(`${appsRoot}/profile`);

        if (onCompanyUpdated) onCompanyUpdated();
      }
    } catch (err) {
      console.error("Update failed:", err);
      Notification("Error", "Failed to update address", "error");
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [store?.loading])
  return (
    <div className="main-content">
      <Card>
        <CardBody>
          <Fragment>
            <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
              <Row>
                {/* Address 1 */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="address_1">{t("Address 1")}</Label>
                  <Controller
                    name="address_1"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.address_1} />
                    )}
                  />
                  <FormFeedback>{errors.address_1?.message}</FormFeedback>
                </div>

                {/* Address 2 */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="address_2">{t("Address 2")}</Label>
                  <Controller
                    name="address_2"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.address_2} />
                    )}
                  />
                  <FormFeedback>{errors.address_2?.message}</FormFeedback>
                </div>

                {/* State */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="state">{t("State")}</Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.state} />
                    )}
                  />
                  <FormFeedback>{errors.state?.message}</FormFeedback>
                </div>

                {/* City */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="city">{t("City")}</Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.city} />
                    )}
                  />
                  <FormFeedback>{errors.city?.message}</FormFeedback>
                </div>

                {/* Country */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="country">{t("Country")}</Label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.country} />
                    )}
                  />
                  <FormFeedback>{errors.country?.message}</FormFeedback>
                </div>

                {/* Zipcode */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="zipcode">{t("Zip Code")}</Label>
                  <Controller
                    name="zipcode"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.zipcode} />
                    )}
                  />
                  <FormFeedback>{errors.zipcode?.message}</FormFeedback>
                </div>
              </Row>

              {/* Buttons */}
              <div className="d-flex justify-content-end mt-4 gap-2">
                <Button type="submit" color="primary" disabled={!store.loading}>
                  {!store.loading ? <Spinner size="sm" /> : t("Save")}
                </Button>
                {/* Optional close button */}
                {/* <Button color="secondary" onClick={toggle}>
            {t("Close")}
          </Button> */}
              </div>
            </Form>
          </Fragment>
        </CardBody>
      </Card>
    </div>
  );
};

export default Address;

