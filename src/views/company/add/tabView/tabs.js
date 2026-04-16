// ** React Imports
import { Fragment } from "react";

// ** Reactstrap Imports
import { Nav, NavItem, NavLink } from "reactstrap";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Icons Imports
import { User, Lock } from "react-feather";
import { IoBusinessOutline } from 'react-icons/io5';
import { FaRegAddressCard } from "react-icons/fa";

const Tabs = ({
  active,
  EditKey,
  AddressKey,
  toggleTab,
}) => {
  // ** Hooks
  const { t } = useTranslation();

  return (
    <Fragment>
      <Nav pills className="mb-1">
        <NavItem>
          <NavLink
            active={active === EditKey}
            onClick={() => toggleTab(EditKey)}
          >
            <IoBusinessOutline className="font-medium-3 " />
            <span className="fw-bold">{t("Company")}</span>
          </NavLink>
        </NavItem>

        {/* <NavItem>
          <NavLink
            active={active === AddressKey}
            onClick={() => toggleTab(AddressKey)}
          >
            <FaRegAddressCard className="font-medium-3" />
            <span className="fw-bold">{t("Address")}</span>
          </NavLink>
          
        </NavItem> */}
     
      </Nav>
    </Fragment>
  )
}

export default Tabs;
