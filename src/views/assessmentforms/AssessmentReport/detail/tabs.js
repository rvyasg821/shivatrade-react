// ** React Imports
import { Fragment, useState } from "react";

// ** Reactstrap Imports
import { Button, Nav, NavItem, NavLink } from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { appsRoot } from "../../../../constants/defaultValues";
// import AddSectionModel from "./model/AddSectionModel";

const Tabs = ({
  active,
  toggleTab,
  id,
  companyDetails,
  questionAnswers
}) => {

  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <Nav pills className="mb-0">
          <NavItem>
            <NavLink
              active={active === companyDetails}
              onClick={() => toggleTab(companyDetails)}
            >
              <span className="fw-bold">{t('Company Details')}</span>
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              active={active === questionAnswers}
              onClick={() => toggleTab(questionAnswers)}
            >
              <span className="fw-bold">{t('Question Answers')}</span>
            </NavLink>
          </NavItem>
        </Nav>
        <div className="black-btn">
          <Button type="button" color="primary" onClick={() => navigate(`${appsRoot}/assessment-forms/assessment-reports/${id}`)} >
            {t("Back")}
          </Button>
        </div>
      </div>
    </Fragment>
  );
};

export default Tabs;
