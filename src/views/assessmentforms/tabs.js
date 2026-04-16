// ** React Imports
import { Fragment, useState } from "react";

import { Button, ButtonToggle, Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import AddSectionModel from "./model/AddSectionModel";

const Tabs = ({
  active,
  addKey,
  editKey,
  toggleTab,
  isDisabled,
  id
}) => {

  const { t } = useTranslation();
  const [openModel, setOpenModel] = useState(false);
  const [title, setTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const closePopup = () => {
    setOpenModel(() => false);
  };

  const handleEditSection = () => {
    setIsEditing(() => true);
    setTitle(() => "EDIT SECTION");
    setOpenModel(true);
  };
  const initialValues = { name: "", description: "", status: 1 };

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap">
        <Nav pills className="mb-0 flex-nowrap">
          <NavItem>
            <NavLink
              active={active === addKey}
              onClick={() => toggleTab(addKey)}
            >
              <span className="fw-bold">{t('Assessment Form')}</span>
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              active={active === editKey}
              disabled={isDisabled}
              onClick={() => toggleTab(editKey)}
            >
              <span className="fw-bold">{t('Sections & Questions')}</span>
            </NavLink>
          </NavItem>
        </Nav>

        {active === editKey && (
          <div className="black-btn">
            <Button type="button" color="primary" onClick={() => {
              handleEditSection()
            }} >
              {t('Add Section')}
            </Button>
          </div>
        )}

        {openModel && (
          <AddSectionModel
            show={openModel}
            closePopup={closePopup}
            title={title}
            isEditing={isEditing}
            initialValues={initialValues}
            id={id}
          />
        )}

      </div>
    </Fragment>
  );
};

export default Tabs;
