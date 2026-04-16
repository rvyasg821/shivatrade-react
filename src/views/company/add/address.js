// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getCompany, updateCompanyDetails } from "@src/views/auth/profile/editCompany/store";

// ** Reactstrap Imports
import { Row, Form, Label,CardBody ,Input, Button, Spinner, FormFeedback, Card } from "reactstrap";

// ** Third Party Components
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** React Router
import { useNavigate, useParams } from "react-router-dom";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { startLoading, stopLoading } from "../../loadingstore";

const Address = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.company);

  const  id  = useParams();

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

  // ✅ Fetch company details by ID
  useEffect(() => {
    if (id?.id) {
      dispatch(getCompany(id));
    }
  }, [dispatch, id?.id]);


 useEffect(() => {
        if (!id?.id) { dispatch(stopLoading()); return; }
        if (store?.loading) {
            dispatch(startLoading())
        } else {
            dispatch(stopLoading())
        }
    }, [store?.loading, id?.id])

  // ✅ Populate form with existing company data
  useEffect(() => {
    const company = store?.companyItem;
    if (!company) return;

    reset({
      address_1: company.address_1 || "",
      address_2: company.address_2 || "",
      state: company.state || "",
      city: company.city || "",
      country: company.country || "",
      zipcode: company.zipcode || "",
    });
  }, [store?.companyItem, reset]);

  // ✅ Submit form
 const onSubmit = async (values) => {
  const companyId = store.companyItem?.id || store.companyItem?._id || id;

  if (!companyId) {
    Notification("Company ID not found");
    return;
  }

  const payload = {
    address_1: values.address_1,
    address_2: values.address_2,
    state: values.state,
    city: values.city,
    country: values.country,
    zipcode: values.zipcode,
  };

  try {
    const result = await dispatch(updateCompanyDetails({ companyId, payload })).unwrap();

    if (result.actionFlag === "UPDATE_COMPANY_DETAILS_SCS") {
      Notification("Success", store.success, "success");
      navigate(`${appsRoot}/company`);
      if (onCompanyUpdated) onCompanyUpdated();
    }
  } catch (err) {
    console.error("Update failed:", err);
  }
};


  return (
    <div className="main-content">
           <Card>
              <CardBody>
    <Fragment>
      <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
        <Row>
          {/* Address Line 1 */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="address_1">{t("Address 1")}</Label>
            <Controller
              name="address_1"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.address_1} />}
            />
            <FormFeedback>{errors.address_1?.message}</FormFeedback>
          </div>

          {/* Address Line 2 */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="address_2">{t("Address 2")}</Label>
            <Controller
              name="address_2"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.address_2} />}
            />
            <FormFeedback>{errors.address_2?.message}</FormFeedback>
          </div>

          {/* State */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="state">{t("State")}</Label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.state} />}
            />
            <FormFeedback>{errors.state?.message}</FormFeedback>
          </div>

          {/* City */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="city">{t("City")}</Label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.city} />}
            />
            <FormFeedback>{errors.city?.message}</FormFeedback>
          </div>

          {/* Country */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="country">{t("Country")}</Label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.country} />}
            />
            <FormFeedback>{errors.country?.message}</FormFeedback>
          </div>

          {/* Zipcode */}
          <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
            <Label for="zipcode">{t("Zip Code")}</Label>
            <Controller
              name="zipcode"
              control={control}
              render={({ field }) => <Input {...field} invalid={!!errors.zipcode} />}
            />
            <FormFeedback>{errors.zipcode?.message}</FormFeedback>
          </div>
        </Row>

        {/* Save Button */}
        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button type="submit" color="primary" disabled={store.loading}>
            {store.loading ? <Spinner size="sm" /> : t("Save")}
          </Button>
        </div>
      </Form>
    </Fragment>
    </CardBody>
    </Card>
    </div>
  );
};

export default Address;
