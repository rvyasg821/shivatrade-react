import React, { useEffect, useRef } from "react";
import OtpInput from "react-otp-input";
// import "./Wizard.scss";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import { cleanCreateAccountMessage, createAccount, verificationOtpVerify } from "./store";
import { useDispatch, useSelector } from "react-redux";
import Notification from "@components/toast/notification";
import { updateUserSignup } from "../../users/store";

const validationOtpSchema = Yup.object().shape({
    otp: Yup.string()
        .length(6, "OTP must be 6 digits")
        .required("OTP is required"),
});

function StepVerficationOtp({ nextStep, step1Data }) {
    const initialValuesOtp = { otp: "" };
    const { t } = useTranslation();
    const formikRef = useRef(); // ✅ added
    const dispatch = useDispatch();
    const store = useSelector((state) => state.register);
    const { loading, actionFlag } = store;
    console.log('OTP VERIFICATION STEP1DATA', step1Data);

    useEffect(() => {
        if (store?.actionFlag === "REGISTER_SCS" && store?.registerItem?._id) {
            // Registration successful, navigate to next step (plan selection)
            // setTimeout(() => {
            nextStep()
            dispatch(cleanCreateAccountMessage());
            // }, 1000);
        }

        if (store?.actionFlag === "REGISTER_ERR" && store?.error) {
            Notification("Error", store.error, "warning");
            // Clean up messages after showing error
            // setTimeout(() => {
            dispatch(cleanCreateAccountMessage());
            // }, 100);
        }

        // if (store?.actionFlag === "VERIFY_OTP_ERROR" && store?.error) {
        //     Notification("Error", store.error, "warning");
        //     // Clean up messages after showing error
        //     // setTimeout(() => {
        //     // dispatch(cleanCreateAccountMessage());
        //     // }, 100);
        //     console.log('store?.actionFlag === "VERIFY_OTP_ERROR" STEPVERIFICATION ',Math.round(Math.random()*10));

        // }

        if (store?.actionFlag === "VERIFY_OTP_SUCCESS") {
            if (step1Data?.isEmailUpdated) {
                dispatch(updateUserSignup({ id: step1Data.userId, data: step1Data }))
                    .unwrap()
                    .then((res) => {
                        console.log('this called after api give error to update !!!!!!!!!!!!!');
                        if (res.statusCode === 5150) {
                            console.log('statuscode 5150 if conditions !!!!');
                            
                        } else {
                             nextStep();
                        }
                       
                    });
            } else {
                console.log('this is called stepVerifications !!!!!');
                
                dispatch(createAccount(step1Data))
            }
        }

    }, [store.actionFlag, store.success, store.error, store.registerItem, dispatch, nextStep]);

    const onSubmitOtp = async (values) => {
        console.log('Verfication OTP 111111==>',step1Data?.email);
        
        dispatch(verificationOtpVerify({ email: step1Data?.email, otp: values.otp }))
            .unwrap()
            .then((res) => {
                // log('VERIFICATION API CALLING!!! .THEN')
                // dispatch(createAccount(step1Data))
                if (res?.actionFlag === 'VERIFY_OTP_ERROR') {
                    Notification("Error", res.error, "warning")
                }
                console.log('>THEN OTP VERIFY WORKING', res);

            })
            .catch(() => {
                // console.error("❌ OTP Verification failed:", err);
                //    Notification("Error", "Invalid OTP. Please check and try again.", "warning");

            });
    };

    return (
        <div className="">
            {/* <h2>Verification Email</h2> */}

            {/* Card Body */}
            <div className="card-body otp-card">
                <Formik
                    innerRef={formikRef} // ✅ added
                    initialValues={initialValuesOtp}
                    validationSchema={validationOtpSchema}
                    onSubmit={onSubmitOtp}
                >
                    {({ setFieldValue, values, errors, touched }) => (
                        <Form className="h-100">
                            <div className="form-group otp-form">
                                <label className="otp-varification fw-bolder">{`Enter the 6-digit code sent to ${step1Data?.email}`}
                                </label>
                                <div className="otp-input-main">
                                    <OtpInput
                                        value={values.otp}
                                        onChange={(otp) => setFieldValue("otp", otp)}
                                        numInputs={6}
                                        renderSeparator={<span>  </span>}
                                        className={""}
                                        renderInput={(props) => (
                                            <input
                                                {...props}
                                                type="text" // Use "text" instead of "number" for better handling
                                                // className={`form-control ${errors.otp && touched.otp ? "is-invalid" : ""
                                                //     }`}
                                                className={"form-control otp-box"}
                                            />
                                        )}
                                    />
                                </div>
                                {errors.otp && touched.otp && (
                                    <div className="invalid-feedback d-block text-center mt-2">
                                        {errors.otp}
                                    </div>
                                )}
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>

            {/* Bottom Buttons (UI unchanged) */}
            <div className="button-row main-content text-center">
                {/* <button className="btn btn-primary" onClick={prevStep}>Previous</button> */}
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => formikRef.current?.handleSubmit()}
                    disabled={loading} // ✅ Disable while loading
                >
                    {loading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                            Loading...
                        </>
                    ) : (
                        "Next"
                    )}
                </button>
            </div>
        </div>
    );
}

export default StepVerficationOtp;
