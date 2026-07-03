import React from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import { useTranslation } from "react-i18next";
import StepVerficationOtp from "./StepVerficationOtp";

const EmailVerificationModal = ({ isOpen, toggle, step1Data, nextStep }) => {
    const { t } = useTranslation();

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

                <ModalBody>
                    <StepVerficationOtp step1Data={step1Data} nextStep={nextStep} />
                </ModalBody>
            </Modal>
        </div>
    );
};

export default EmailVerificationModal;
