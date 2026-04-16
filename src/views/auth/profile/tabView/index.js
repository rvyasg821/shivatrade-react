import { Fragment, useState } from "react";
import { Button, Col, Row } from "reactstrap";
import Tabs from "./tabs";
import TabContents from "./tabContents";
import { useNavigate } from "react-router-dom";
import "@styles/react/apps/app-users.scss";
import { ArrowLeft } from "react-feather";
import { appsRoot } from "@constant/defaultValues";
import { useSelector } from "react-redux";

const ProfileTabView = () => {
  const companyKey = "company";
  const accountKey = "account";
  const changePasswordKey = "change-password";

  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  // Default to company tab for Company Admin, account tab for others
  const [active, setActive] = useState(isCompanyAdmin ? companyKey : accountKey);
  const navigate = useNavigate();

  const toggleTab = (tab) => {
    if (active !== tab) setActive(tab);
  };

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col xl={12} lg={12} xs={{ order: 0 }} md={{ order: 1, size: 12 }}>
            <div className="d-flex justify-content-between align-items-center mb-0">
              <Tabs
                active={active}
                accountKey={accountKey}
                companyKey={companyKey}
                changePasswordKey={changePasswordKey}
                toggleTab={toggleTab}
              />
              {isCompanyAdmin && (
                <Button type="button" color="primary" className="d-flex align-items-center"
                  onClick={() => navigate(`${appsRoot}/profile`)}>
                  <ArrowLeft size={17} />
                </Button>
              )}
            </div>
            <TabContents
              active={active}
              accountKey={accountKey}
              companyKey={companyKey}
              changePasswordKey={changePasswordKey}
            />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default ProfileTabView;
