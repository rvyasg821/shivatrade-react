import React, { useRef } from 'react'
import { Formik, Form } from "formik";
import OtpInput from "react-otp-input";
import * as Yup from "yup";
import { useDispatch, useSelector } from 'react-redux';
import { verifyAssessmentReport } from '../store';
import Notification from '../../../../@core/components/toast/notification';
import { useTranslation } from "react-i18next";

const validationOtpSchema = Yup.object().shape({
    otp: Yup.string()
        .length(6, "OTP must be 6 digits")
        .required("OTP is required"),
});

const AssessStepVerificationOtp = ({ assessmentId, nextStep ,tentanId }) => {
    const { t } = useTranslation();
    const initialValuesOtp = { otp: "" };
    const assessmentReport = useSelector((state) => state.assessmentReport);

    const formikRef = useRef(); // ✅ added
    const dispatch = useDispatch();

    const onSubmitOtp = async (values) => {
        if (values) {
            const payload = {
                _id: assessmentId,
                email_code: values?.otp
            }
            console.log('Email Verify Payload ==>',payload,tentanId);
            
            dispatch(verifyAssessmentReport({id:tentanId,data:payload}))
                .then((res) => {

                    if (res.payload.actionFlag === "ASSESSMENT_REPORT_VERIFY_ERROR") {
                        Notification("Error", "Email verification code not matched", "warning");
                    } else {
                        nextStep()
                    }

                }).catch((error) => {

                    Notification("Error", error, "warning");
                });
        }
    };

    return (
        <div className="">

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
                                <label className="otp-varification fw-bolder">{`Enter the 6-digit code sent to `}
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

            <div className="button-row main-content text-end">
                {/* <button className="btn btn-primary" onClick={prevStep}>Previous</button> */}
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => formikRef.current?.handleSubmit()}
                    disabled={assessmentReport?.loading}
                >
                    {assessmentReport?.loading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                            {t('Loading...')}
                        </>
                    ) : (
                        t("Next")
                    )}
                </button>
            </div>
        </div>
    )
}

export default AssessStepVerificationOtp