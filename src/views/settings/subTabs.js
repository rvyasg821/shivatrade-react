import { Fragment } from "react";
import { Nav, NavItem, NavLink } from "reactstrap";
import TabContents from "./tabContents";

const SubTabs = ({
  subActive,
  subToggleTab,
  subTabs,
  data,
  selectedMainTab,
  dynamicMainTab,
  dynamicData,
}) => {
  return (
    <Fragment>
      {subTabs.length > 1 && (
        <Nav pills className="mb-2">
          {subTabs.map((subTab, index) => (
            <NavItem key={index}>
              <NavLink
                className={subActive === subTab.group ? "tab-colors active" : ""}
                onClick={() => subToggleTab(subTab.group)}
              >
                <span className="fw-bold">
                  {subTab.group.charAt(0).toUpperCase() + subTab.group.slice(1)}
                </span>
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      )}

      <TabContents
        active={subActive}
        data={data}
        dynamicData={dynamicData}
        selectedMainTab={selectedMainTab}
        dynamicMainTab={dynamicMainTab}
      />
    </Fragment>
  );
};

export default SubTabs;
