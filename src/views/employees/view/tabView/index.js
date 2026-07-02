// ** React Imports
import { Fragment, useState, useEffect } from "react";

import { Card, CardBody } from "reactstrap";

import { useSelector } from "react-redux";
import Tabs from "./tabs";
import TabContents from "./tabContents";

// ** Styles
import "@styles/react/apps/app-users.scss";

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
    // HR tools disabled — Attendance & Leave tabs hidden on the employee detail page.
    attendance: false, // was: isSuperAdmin || hasTool("hrm-attendance")
    leave: false,      // was: isSuperAdmin || hasTool("hrm-leave")
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
    <Card className="mb-1">
      <CardBody>
        <Tabs active={active} toggleTab={toggleTab} toolFlags={toolFlags} />
        <TabContents active={active} toolFlags={toolFlags} />
      </CardBody>
    </Card>
  );
};

export default EmployeeTabView;
