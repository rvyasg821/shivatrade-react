// ** React Imports
import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Button,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";

// ** Icons Import
import { ArrowLeft, User, Lock } from "react-feather";

// ** Components
import UserForm from "../add";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

// ** Third Party Components
import { useTranslation } from "react-i18next";

const UserTabs = (props) => {
  const { redirectPath } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState("#details"); // Changed to include #

  const toggleTab = (tab) => {
    if (active !== tab) {
      setActive(tab);
    }
  };

  return (
    <Fragment>
      <div className=""></div>
      <div className="app-user-view">
        <Row>
          <Col>
            <Nav pills className="mb-2">

            </Nav>
          </Col>
        </Row>

        <TabContent activeTab={active}>
          <TabPane tabId="#details">
            <UserForm redirectPath={redirectPath} />
          </TabPane>

        </TabContent>
      </div>
    </Fragment>
  )
}

export default UserTabs;
