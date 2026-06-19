import { Fragment, useState } from "react";
import { Card, CardBody } from "reactstrap";
import { useSelector } from "react-redux";
import "@styles/react/apps/app-users.scss";

import Tabs from "./tabs";
import TabContents from "./tabContents";

const ProfileTabView = () => {
  const companyKey = "company";
  const addressKey = "address";
  const bankKey = "bank";
  const accountKey = "account";
  const changePasswordKey = "change-password";

  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  // Default to company tab for Company Admin, account tab for others
  const [active, setActive] = useState(isCompanyAdmin ? companyKey : accountKey);

  const toggleTab = (tab) => {
    if (active !== tab) setActive(tab);
  };

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody>
          <Tabs
            active={active}
            accountKey={accountKey}
            companyKey={companyKey}
            addressKey={addressKey}
            bankKey={bankKey}
            changePasswordKey={changePasswordKey}
            toggleTab={toggleTab}
          />
          <TabContents
            active={active}
            accountKey={accountKey}
            companyKey={companyKey}
            addressKey={addressKey}
            bankKey={bankKey}
            changePasswordKey={changePasswordKey}
          />
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default ProfileTabView;
