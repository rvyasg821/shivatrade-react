import React from "react";
import { Modal, ModalBody, ModalHeader, Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import ProfileTabView from "./tabView/index"; // adjust path if needed

const EditProfileModal = ({ isOpen, toggle }) => {
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
        <ModalHeader toggle={toggle}>
          <h4 className="text-center">{t("Edit Profile")}</h4>
        </ModalHeader>

        <ModalBody>
          <ProfileTabView toggle={toggle} />
        </ModalBody>
      </Modal>
    </div>
  );
};

export default EditProfileModal;
