import React from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import { useTranslation } from "react-i18next";
import StepVerficationOtp from "./StepVerficationOtp";
import AssessStepVerificationOtp from "../../assessmentforms/userAssest/step1/assessStepVerificationOtp";

const EmailVerificationModal = ({ isOpen, toggle, step1Data, nextStep, from, assessmentId, tentanId }) => {
    const { t } = useTranslation();
    const isAssess = from === 'AssessementReport'

    return (
        <div className="disabled-backdrop-modal">
            <Modal
                isOpen={isOpen}
                toggle={toggle}
                size="lg"
                backdrop="static"
                className="modal-dialog-centered modal-dialog-case"
            >
                <ModalHeader tag="div" toggle={toggle}>
                    <h4 className="text-center">{t("Email Verification")}</h4>
                </ModalHeader>

                {
                    isAssess ?
                        <ModalBody>
                            <AssessStepVerificationOtp assessmentId={assessmentId} nextStep={nextStep} tentanId={tentanId} />
                        </ModalBody> :
                        <ModalBody>
                            <StepVerficationOtp step1Data={step1Data} nextStep={nextStep} />
                        </ModalBody>
                }
            </Modal>
        </div>
    );
};

export default EmailVerificationModal;
