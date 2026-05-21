// ** React Imports
import { Fragment, useState, useEffect } from "react";
import { ArrowLeft } from "react-feather";

// ** Reactstrap Imports
import { Button, Col, Row } from "reactstrap";

import { useSelector } from "react-redux";
import Tabs from "./tabs";
import TabContents from "./tabContents";
import { appsRoot } from "@constant/defaultValues";

// ** Styles
import "@styles/react/apps/app-users.scss";
import { useNavigate } from "react-router-dom";

// Helper to get tools from localStorage (same as nav)
const getToolsFromStorage = () => {
  try {
    const raw = localStorage.getItem('userData');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.companyData?.tools || parsed?.userData?.company?.tools || [];
    }
  } catch { }
  return [];
};

const EmployeeTabView = () => {
  const navigate = useNavigate();

  // Get tools from all sources
  const reduxTools = useSelector((state) => state.authentication?.companyData?.tools) || [];
  const authUserItem = useSelector((state) => state.auth?.authUserItem) || {};
  const authCompanyTools = authUserItem?.company?.tools || [];
  const subscribedTools = reduxTools.length > 0
    ? reduxTools
    : authCompanyTools.length > 0
    ? authCompanyTools
    : getToolsFromStorage();

  const hasTool = (slug) => subscribedTools.some(
    (tool) => tool?.slug === slug || tool?._id === slug
  );

  // Super Admin sees all tabs
  const isSuperAdmin = authUserItem?.role?.name === 'Admin' ||
    authUserItem?.role?.name === 'Super Admin' ||
    authUserItem?.isSystemUser === true;

  const toolFlags = {
    attendance: isSuperAdmin || hasTool("hrm-attendance"),
    leave: isSuperAdmin || hasTool("hrm-leave"),
    documents: isSuperAdmin || hasTool("hrm-documents"),
    contracts: isSuperAdmin || hasTool("hrm-contracts"),
    compliance: isSuperAdmin || hasTool("hrm-compliance"),
  };

  // Set default active tab to first visible tab
  const visibleTabs = Object.entries(toolFlags).filter(([, v]) => v).map(([k]) => k);
  const [active, setActive] = useState(visibleTabs[0] || "attendance");

  useEffect(() => {
    if (!toolFlags[active] && visibleTabs.length > 0) {
      setActive(visibleTabs[0]);
    }
  }, [toolFlags, active]);

  const toggleTab = (tab) => {
    if (active !== tab) {
      setActive(tab);
    }
  };

  return (
    <Fragment>
      <div className="app-user-view">
        <Row>
          <Col
            xl={12}
            lg={12}
            xs={{ order: 0 }}
            md={{ order: 1, size: 12 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-0">
              <Tabs active={active} toggleTab={toggleTab} toolFlags={toolFlags} />
              <Button
                type="button"
                color="primary"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={17} />
              </Button>
            </div>

            <TabContents active={active} toolFlags={toolFlags} />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default EmployeeTabView;
