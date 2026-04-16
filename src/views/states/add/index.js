// ** React Imports
import { Fragment, useEffect, useState, useLayoutEffect } from "react"
import { useNavigate } from 'react-router-dom'

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux"
import { createState, cleanStateMessage } from "../store"
import { getCountryList } from "@src/views/pages/customerbooking/store";
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
    FormFeedback
} from "reactstrap"

import { useForm, Controller } from "react-hook-form"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"

// ** React Dropdown Import
import Select from "react-select"

// ** Custom Components
import Notification from "@components/toast/notification"
import SimpleSpinner from '@components/spinner/Simple-spinner'

// ** Third Party Components
import { useTranslation } from 'react-i18next'

// ** Icons Import
import { ArrowLeft } from "react-feather"

// ** Constant
import {
    appsRoot
} from "@constant/defaultValues"
import { initStateItem } from "@constant/reduxConstant"

// ** Styles
import 'react-phone-input-2/lib/style.css'
import "@styles/react/libs/flatpickr/flatpickr.scss"

const AddState = () => {
    // ** Hooks
    const { t } = useTranslation()
    const navigate = useNavigate()

    // ** Store vars
    const dispatch = useDispatch()
    const store = useSelector((state) => state.states)
    const countryStore = useSelector((state) => state.booking)

    // ** States
    const [countryOptions, setCountryOptions] = useState([])
    const [countrySearchInput, setCountrySearchInput] = useState("");

    /* Yup validation schema */
    const StateSchema = yup.object().shape({
        name: yup.string().required(`${t("Name is required")}.`),
        country_id: yup.object().required(`${t("Country is required")}.`).nullable(),
        state_code: yup.string().required(`${t("State code is required")}.`)
    })

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        mode: "all",
        defaultValues: initStateItem,
        resolver: yupResolver(StateSchema)
    })

    useEffect(() => {
        /* For blank message api called inside */
        if (store?.actionFlag || store?.success || store?.error) {
            dispatch(cleanStateMessage(null))
        }

        if (countryStore?.actionFlag === "COUNTRIES_LST_SCS" || countryStore.actionFlag === "COUNTRIES_SLOTS_LST_ERR") {
            let ctryOpts = []
            if (countryStore?.CountryItems?.length) {
                ctryOpts = countryStore.CountryItems.map((item) => {
                    return {
                        ...item,
                        value: item?._id,
                        label: item?.name
                    }
                })
            }
            setCountryOptions(ctryOpts)
        }

        if (store?.actionFlag === "STT_CREATED") {
            navigate(`${appsRoot}/states`)
        }

        /* Success toast notification */
        if (store?.success) {
            Notification("Success", store.success, "success")
        }

        /* Error toast notification */
        if (store?.error) {
            Notification("Error", store.error, "warning")
        }
    }, [countryStore.actionFlag, store.actionFlag, store.success, store.error])

    const handleCancel = () => {
        // Reset the form to its initial values
        reset(initStateItem);
        navigate(`${appsRoot}/states`)

    };

    // Function for search country
    const handleSearchCountry = (searchTerm) => {
        setCountrySearchInput(searchTerm)
    }

    // ** Country search debounce
    useEffect(() => {
        let handler;
        if (countrySearchInput) {
            handler = setTimeout(() => {
                dispatch(getCountryList({ search: countrySearchInput }))
            }, 500);
        } else {
            dispatch(getCountryList({ search: countrySearchInput }))
        }

        return () => {
            clearTimeout(handler)
        }
    }, [countrySearchInput])

    const onSubmit = (values) => {
        console.log("onSubmit >>> ", values);
        
        if (values) {
            const sttData = {
                name: values?.name || "",
                state_code: values?.state_code || ""
            }

            console.log("sttData", sttData);
            

            if (values?.status === "Active") {
                sttData.status = true;
            } else {
                sttData.status = false;
            }

            if (values?.country_id) {
                sttData.country_id = values.country_id?.value || values?.country_id || ""
            }

            // console.log("onSubmit >>> ", values, sttData)
            dispatch(createState(sttData))
        }
    }
    useEffect(() => {
        if (!store?.loading) {
            // document.body.classList.add("loader-body");
            dispatch(startLoading())
        } else {
            // document.body.classList.remove("loader-body");
            dispatch(stopLoading())
        }
    }), [store?.loading]
    return (
        <Fragment>
            {/* {!store?.loading ? (
                <SimpleSpinner />
            ) : null} */}

            <div className="main-content">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="mb-0">{t("Add County / State")}</h3>

                    <Button
                        type="button"
                        className="ms-2 btn-primary"
                        onClick={() => navigate(`${appsRoot}/states`)}
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

                                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6'>
                                        <Label className='form-label' for='name'>
                                            {t("Name")}
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
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.name?.message}</FormFeedback>
                                    </div>

                                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6'>
                                        <Label className='form-label' for='state_code'>
                                            {t("County / State Code")}
                                        </Label>
                                        <Controller
                                            id="state_code"
                                            name="state_code"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    className=""
                                                    autoComplete="off"
                                                    invalid={errors.state_code && true}
                                                />
                                            )}
                                        />
                                        <FormFeedback>{errors.state_code?.message}</FormFeedback>
                                    </div>

                                    <div className='mb-2 col-lg-6 col-md-6 col-sm-6'>
                                        <Label className='form-label' for='country_id'>
                                            {t("Country")}
                                        </Label>
                                        <Controller
                                            id="country_id"
                                            name="country_id"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    isClearable={false}
                                                    options={countryOptions}
                                                    className="react-select"
                                                    classNamePrefix="select"
                                                    placeholder={t("Select country...")}
                                                    onInputChange={(value) => handleSearchCountry(value)}
                                                />
                                            )}
                                        />
                                        <FormFeedback className="d-block">{errors.country_id?.message}</FormFeedback>
                                    </div>

                                    <div className="mb-2 col-lg-4 col-md-4 col-sm-6">
                                        <Label className="form-label" for="status">
                                            {t("Status")}
                                        </Label>
                                        <Controller
                                            id="status"
                                            name="status"
                                            defaultValue=""
                                            control={control}
                                            render={({ field }) => (
                                                <Row className="px-1 status">
                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
                                                        <Input
                                                            {...field}
                                                            id="Active"
                                                            type="radio"
                                                            value="Active"
                                                            checked={field?.value === "Active"}
                                                        />
                                                        <Label className="form-check-label" for="Active">
                                                            {t("Active")}
                                                        </Label>
                                                    </div>

                                                    <div
                                                        className="form-check"
                                                        style={{ width: "max-content" }}
                                                    >
                                                        <Input
                                                            {...field}
                                                            id="Inactive"
                                                            type="radio"
                                                            value="Inactive"
                                                            checked={field?.value === "Inactive"}
                                                        />
                                                        <Label className="form-check-label" for="Inactive">
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
                                <div className="main-form-btn">
                                    <div className="form-btn  mt-2">
                                        <Button
                                            type="submit"
                                            color="primary"
                                            disabled={!store.loading}
                                        >
                                            {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm"/>)}
                                        </Button>
                                    </div>
                                    <div className="form-btn  mt-2">
                                        <Button
                                            type="button"
                                            color="secondary"
                                            disabled={!store.loading}
                                            onClick={handleCancel}
                                        >
                                            {store?.loading ? t("Cancel") : (<Spinner className="spinner-border-login" size="sm" />)}
                                        </Button>
                                    </div>
                                </div>
                            </Form>
                        </Row>
                    </CardBody>
                </Card>
            </div>
        </Fragment>
    )
}

export default AddState
