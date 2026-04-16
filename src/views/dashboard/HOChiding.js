
import React, { useState } from "react";
import { Card, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
// import { BiSettings } from "../components/SVGIcons/index";
import { FiSettings } from "react-icons/fi";

const ToggleComp = (WrappedComponent) => {
  return (props) => {
    const { show, className, handleToggle } = props;
    const [open, setOpen] = useState(false);

    return (
      <>
        {show ? (
          <Card className={className}>

            {/* HEADER BAR */}
            <div className="widget-settings-top-right">
              <Dropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle tag="span" className="nav-link dropdown-user-link">
                  <FiSettings size={22} className="text-white" />
                </DropdownToggle>

                <DropdownMenu className="navlink-dropdown" end>
                  <DropdownItem onClick={() => handleToggle()}>
                    <span>
                      Remove Widget
                    </span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
            {/* CONTENT */}
            <WrappedComponent {...props} />
          </Card>
        ) : null}
      </>
    );
  };
};

export default ToggleComp;
