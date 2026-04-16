import { Fragment } from "react";
import { Nav, Col, NavItem, NavLink, Collapse } from "reactstrap";
import { useTranslation } from "react-i18next";
import SubTabs from "./subTabs";

// ✅ Use config file, not JSON
import settingsConfig from "./settingsConfig";

const Tabs = ({
  active,
  toggleTab,
  subTabs,
  subActive,
  subToggleTab,
  data,
  dynamicData,
  isSubTabsOpen,
  selectedMainTab,
  dynamicMainTab,
}) => {
  const { t } = useTranslation();

  // All main tab names come from keys of settingsConfig
  const mainTabs = Object.keys(settingsConfig);

  return (
    <Fragment>
      <Nav pills className="mb-2">
        {mainTabs.map((tabName, index) => {
          const tabKey = `#${tabName.toLowerCase()}`;
          return (
            <NavItem key={index}>
              <NavLink
                active={active === tabKey}
                onClick={() => toggleTab(tabKey)}
              >
                <span className="fw-bold">
                  {t(tabName.charAt(0).toUpperCase() + tabName.slice(1))}
                </span>
              </NavLink>
            </NavItem>
          );
        })}
      </Nav>

      <Collapse isOpen={isSubTabsOpen}>
        {subTabs.length > 0 && (
          <Col xs="12">
            <SubTabs
              subTabs={subTabs}
              subActive={subActive}
              subToggleTab={subToggleTab}
              selectedMainTab={selectedMainTab}
              dynamicMainTab={dynamicMainTab}
              data={data}
              dynamicData={dynamicData}
            />
          </Col>
        )}
      </Collapse>
    </Fragment>
  );
};

export default Tabs;
