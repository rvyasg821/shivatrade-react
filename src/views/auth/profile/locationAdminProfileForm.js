// ** React Imports
import { Fragment, useEffect, useState } from "react";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { authUpdateMe } from "../store";
import { handleImgSrcError } from "@src/utility/Utils";

// ** Reactstrap Imports
import {
  Row, Col, Card, Form, Label, Input, Button, Spinner, CardBody,
  FormFeedback, Nav, NavItem, NavLink, TabContent, TabPane,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Notification from "@components/toast/notification";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { getCountryList } from "@src/views/auth/register/utils/countryTimezoneUtils";

// ** Constant
import { countryCodeEditable, disableCountryDropdown, hostRestApiUrl } from "@constant/defaultValues";
import Avatar from "@src/assets/images/avatars/avatar.jpeg";

// ** Icons
import { User, Phone, CreditCard, MapPin } from "react-feather";
import DateInput from "@components/date-input";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Styles
import "react-phone-input-2/lib/style.css";
import { startLoading, stopLoading } from "../../loadingstore";

const LocationAdminProfileForm = ({ toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const companyStore = useSelector((state) => state.company);

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const [activeTab, setActiveTab] = useState("personal");
  const countryList = getCountryList();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    email: yup.string().required(`${t("Email is required")}.`).email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    gender: yup.string().required(`${t("Gender is required")}.`),
  });

  const {
    reset, control, setValue, handleSubmit, watch,
    formState: { errors },
  } = useForm({
    mode: "all",
    shouldFocusError: false,
    defaultValues: {
      fname: "", lname: "", middle_name: "", email: "", mobile: "", gender: "",
      country_code: { dialCode: "1", countryCode: "us", name: "United States" },
      photo: null,
      date_of_birth: "", marital_status: "", nationality: "", home_telephone: "",
      address_line1: "", address_line2: "", city: "", state: "", postcode: "", country: "",
      // Emergency contact
      kin_name: "", kin_relationship: "", kin_address: "", kin_postcode: "", kin_phone: "", kin_email: "",
      // Bank details
      bank_name: "", account_holder_name: "", sort_code: "", account_number: "",
    },
    resolver: yupResolver(ProfileSchema),
  });

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  // Load user data
  useEffect(() => {
    const user = store?.authUserItem;
    if (!user) return;

    const firstName = user.first_name || user.name?.split(" ")[0] || "";
    const lastName = user.last_name || user.name?.split(" ").slice(1).join(" ") || "";

    reset({
      fname: firstName,
      lname: lastName,
      middle_name: user.middle_name || "",
      email: user.email || "",
      mobile: user.mobile ? `${(user.country_code?.dialCode || "")}${user.mobile}` : "",
      gender: user.gender || "",
      photo: user.photo || null,
      country_code: user.country_code || { dialCode: "1", countryCode: "us", name: "United States" },
      date_of_birth: user.date_of_birth || "",
      marital_status: user.marital_status || "",
      nationality: user.nationality || "",
      home_telephone: user.home_telephone || "",
      address_line1: user.address_line1 || "",
      address_line2: user.address_line2 || "",
      city: user.city || "",
      state: user.state || "",
      postcode: user.postcode || "",
      country: user.country || "",
      kin_name: user.kin_name || "",
      kin_relationship: user.kin_relationship || "",
      kin_address: user.kin_address || "",
      kin_postcode: user.kin_postcode || "",
      kin_phone: user.kin_phone || "",
      kin_email: user.kin_email || "",
      bank_name: user.bank_name || "",
      account_holder_name: user.account_holder_name || "",
      sort_code: user.sort_code || "",
      account_number: user.account_number || "",
    });

    // Sync country dropdown
    if (user.country) {
      const cOption =
        countryList.find((c) => c.value.toUpperCase() === user.country.toUpperCase()) ||
        countryList.find((c) => c.label.toLowerCase() === user.country.toLowerCase());
      if (cOption) setSelectedCountry(cOption);
    }
  }, [store?.authUserItem, reset]);

  // Default address country from company country
  useEffect(() => {
    const user = store?.authUserItem;
    const company = companyStore?.companyItem;
    if (company && user && !user.country && company.selected_country) {
      setValue("country", company.selected_country);
    }
  }, [companyStore?.companyItem, store?.authUserItem]);

  const handleChangeMobile = (name, value, data) => {
    setValue(name, value);
    setValue("country_code", data);
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const dialCode = values.country_code?.dialCode || "";
      let mobileValue = values.mobile || "";
      if (mobileValue.startsWith(dialCode)) {
        mobileValue = mobileValue.slice(dialCode.length);
      }
      mobileValue = mobileValue.trim();

      let photoValue = values.photo;
      if (photoValue instanceof File) {
        photoValue = await fileToBase64(photoValue);
      }

      const usrData = {
        first_name: values.fname,
        last_name: values.lname,
        middle_name: values.middle_name || "",
        email: values.email,
        mobile: mobileValue,
        gender: values.gender,
        photo: photoValue,
        date_of_birth: values.date_of_birth || null,
        marital_status: values.marital_status || "",
        nationality: values.nationality || "",
        home_telephone: values.home_telephone || "",
        address_line1: values.address_line1 || "",
        address_line2: values.address_line2 || "",
        city: values.city || "",
        state: values.state || "",
        postcode: values.postcode || "",
        country: values.country || "",
        kin_name: values.kin_name || null,
        kin_relationship: values.kin_relationship || null,
        kin_address: values.kin_address || null,
        kin_postcode: values.kin_postcode || null,
        kin_phone: values.kin_phone || null,
        kin_email: values.kin_email || null,
        bank_name: values.bank_name || null,
        account_holder_name: values.account_holder_name || null,
        sort_code: values.sort_code || null,
        account_number: values.account_number || null,
      };

      if (mobileValue) {
        usrData.country_code = values.country_code;
      }

      try {
        await dispatch(authUpdateMe(usrData)).unwrap();
        Notification("Success", t("Profile updated successfully"), "success");
      } catch (error) {
        Notification("Error", t("Profile update failed"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  const getBackendImageUrl = (photo) => {
    if (typeof photo !== "string" || !photo.trim()) return null;
    if (photo.startsWith("http")) return photo;
    const cleanPath = photo.replace(/^\/+/, "");
    return `${hostRestApiUrl}/${cleanPath}`;
  };

  return (
    <div className="main-content">
      <Card>
        <CardBody>
          <Nav tabs className="mb-2">
            <NavItem>
              <NavLink active={activeTab === "personal"} onClick={() => setActiveTab("personal")} style={{ cursor: "pointer" }}>
                <User size={14} className="me-50" />{t("Personal Info")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === "address"} onClick={() => setActiveTab("address")} style={{ cursor: "pointer" }}>
                <MapPin size={14} className="me-50" />{t("Address")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === "emergency"} onClick={() => setActiveTab("emergency")} style={{ cursor: "pointer" }}>
                <Phone size={14} className="me-50" />{t("Emergency Contact")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === "bank"} onClick={() => setActiveTab("bank")} style={{ cursor: "pointer" }}>
                <CreditCard size={14} className="me-50" />{t("Bank Details")}
              </NavLink>
            </NavItem>
          </Nav>

          <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
            <TabContent activeTab={activeTab}>

              {/* ── PERSONAL INFO TAB ── */}
              <TabPane tabId="personal">
                <h6 className="mb-1">{t("Personal Information")}</h6>
                <Row>
                  <Col md={4} className="mb-2">
                    <Label className="form-label">{t("First Name")} <span className="text-danger">*</span></Label>
                    <Controller name="fname" control={control}
                      render={({ field }) => <Input {...field} invalid={!!errors.fname} />} />
                    <FormFeedback>{errors.fname?.message}</FormFeedback>
                  </Col>
                  <Col md={4} className="mb-2">
                    <Label className="form-label">{t("Middle Name")}</Label>
                    <Controller name="middle_name" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Label className="form-label">{t("Last Name")} <span className="text-danger">*</span></Label>
                    <Controller name="lname" control={control}
                      render={({ field }) => <Input {...field} invalid={!!errors.lname} />} />
                    <FormFeedback>{errors.lname?.message}</FormFeedback>
                  </Col>

                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Email")}</Label>
                    <Controller name="email" control={control}
                      render={({ field }) => <Input {...field} disabled />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Mobile")}</Label>
                    <Controller name="mobile" control={control}
                      render={({ field }) => (
                        <PhoneInput {...field} autoComplete="off" inputClass="w-100" country={"us"}
                          inputProps={{ name: "mobile" }}
                          disableDropdown={disableCountryDropdown}
                          countryCodeEditable={countryCodeEditable}
                          onChange={(val, data) => handleChangeMobile("mobile", val, data)} />
                      )} />
                  </Col>

                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Date of Birth")}</Label>
                    <Controller name="date_of_birth" control={control}
                      render={({ field }) => <DateInput field={field} id="date_of_birth" maxDate="today" />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Gender")} <span className="text-danger">*</span></Label>
                    <Controller name="gender" control={control}
                      render={({ field }) => (
                        <div className="d-flex gap-2 mt-50">
                          <div className="form-check">
                            <Input type="radio" id="p-male" value="MALE" checked={field.value === "MALE"}
                              onChange={() => field.onChange("MALE")} />
                            <Label className="form-check-label" for="p-male">{t("Male")}</Label>
                          </div>
                          <div className="form-check">
                            <Input type="radio" id="p-female" value="FEMALE" checked={field.value === "FEMALE"}
                              onChange={() => field.onChange("FEMALE")} />
                            <Label className="form-check-label" for="p-female">{t("Female")}</Label>
                          </div>
                        </div>
                      )} />
                    <FormFeedback className="d-block">{errors.gender?.message}</FormFeedback>
                  </Col>

                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Marital Status")}</Label>
                    <Controller name="marital_status" control={control}
                      render={({ field }) => (
                        <Input type="select" {...field}>
                          <option value="">{t("Select")}</option>
                          <option value="Single">{t("Single")}</option>
                          <option value="Married">{t("Married")}</option>
                          <option value="Divorced">{t("Divorced")}</option>
                          <option value="Widowed">{t("Widowed")}</option>
                        </Input>
                      )} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Nationality")}</Label>
                    <Controller name="nationality" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>

                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Home Telephone")}</Label>
                    <Controller name="home_telephone" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label className="form-label">{t("Photo")}</Label>
                    <Controller name="photo" control={control}
                      render={({ field }) => {
                        const value = field.value;
                        const imageUrl = getBackendImageUrl(typeof value === "string" ? value : null);
                        const previewUrl = value instanceof File ? URL.createObjectURL(value) : null;
                        return (
                          <div className="file-wrapper d-flex">
                            <Input type="file" accept="image/*" className="form-control"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) field.onChange(file); }} />
                            {imageUrl && !previewUrl && (
                              <img src={imageUrl} className="file-preview-icon fileicon" alt=""
                                onError={(e) => handleImgSrcError(e, Avatar)} />
                            )}
                            {previewUrl && (
                              <img src={previewUrl} className="file-preview-icon fileicon" alt=""
                                onError={(e) => handleImgSrcError(e, Avatar)} />
                            )}
                          </div>
                        );
                      }} />
                  </Col>
                </Row>

              </TabPane>

              {/* ── ADDRESS TAB ── */}
              <TabPane tabId="address">
                <h6 className="mb-1">{t("Address")}</h6>
                <Row>
                  <Col md={6} className="mb-2">
                    <Label>{t("Address Line 1")}</Label>
                    <Controller name="address_line1" control={control}
                      render={({ field }) => <Input {...field} placeholder={t("Street address")} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Address Line 2")}</Label>
                    <Controller name="address_line2" control={control}
                      render={({ field }) => <Input {...field} placeholder={t("Apartment, suite, etc.")} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("City")}</Label>
                    <Controller name="city" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("State")}</Label>
                    <Controller name="state" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Zip Code")}</Label>
                    <Controller name="postcode" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Country")}</Label>
                    <Controller name="country" control={control}
                      render={({ field }) => (
                        <Select
                          isClearable
                          options={countryList}
                          value={selectedCountry}
                          placeholder={t("Select Country")}
                          className="react-select"
                          classNamePrefix="select"
                          onChange={(option) => {
                            setSelectedCountry(option);
                            field.onChange(option?.value || "");
                          }}
                        />
                      )} />
                  </Col>
                </Row>
              </TabPane>

              {/* ── EMERGENCY CONTACT TAB ── */}
              <TabPane tabId="emergency">
                <h6 className="mb-1">{t("Emergency Contact / Next of Kin")}</h6>
                <Row>
                  <Col md={6} className="mb-2">
                    <Label>{t("Name")}</Label>
                    <Controller name="kin_name" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Relationship")}</Label>
                    <Controller name="kin_relationship" control={control}
                      render={({ field }) => (
                        <Input type="select" {...field}>
                          <option value="">{t("Select")}</option>
                          <option value="Spouse">{t("Spouse")}</option>
                          <option value="Parent">{t("Parent")}</option>
                          <option value="Sibling">{t("Sibling")}</option>
                          <option value="Child">{t("Child")}</option>
                          <option value="Friend">{t("Friend")}</option>
                          <option value="Other">{t("Other")}</option>
                        </Input>
                      )} />
                  </Col>
                  <Col md={12} className="mb-2">
                    <Label>{t("Address")}</Label>
                    <Controller name="kin_address" control={control}
                      render={({ field }) => <Input type="textarea" rows={2} {...field} />} />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Label>{t("Postcode")}</Label>
                    <Controller name="kin_postcode" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Label>{t("Phone")}</Label>
                    <Controller name="kin_phone" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Label>{t("Email")}</Label>
                    <Controller name="kin_email" control={control}
                      render={({ field }) => <Input type="email" {...field} />} />
                  </Col>
                </Row>
              </TabPane>

              {/* ── BANK DETAILS TAB ── */}
              <TabPane tabId="bank">
                <h6 className="mb-1">{t("Bank Details")}</h6>
                <Row>
                  <Col md={6} className="mb-2">
                    <Label>{t("Bank Name")}</Label>
                    <Controller name="bank_name" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Account Holder Name")}</Label>
                    <Controller name="account_holder_name" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Sort Code")}</Label>
                    <Controller name="sort_code" control={control}
                      render={({ field }) => <Input {...field} placeholder="00-00-00" />} />
                  </Col>
                  <Col md={6} className="mb-2">
                    <Label>{t("Account Number")}</Label>
                    <Controller name="account_number" control={control}
                      render={({ field }) => <Input {...field} />} />
                  </Col>
                </Row>
              </TabPane>

            </TabContent>

            <div className="d-flex justify-content-end mt-2 gap-2 pt-1 pb-2">
              <Button type="submit" color="primary" disabled={!store.loading}>
                {store?.loading ? t("Save") : <Spinner size="sm" />}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </div>
  );
};

export default LocationAdminProfileForm;
