import { Fragment } from 'react';
import { TabPane, TabContent } from 'reactstrap';
import { useSelector } from 'react-redux';

import ProfileForm from '../profileForm';
import ChangePassword from '../changePassword';
import Step1CompanyDetails from '../editCompany/Step1CompanyDetails';

const TabContents = ({ active, accountKey, changePasswordKey, companyKey }) => {
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  return (
    <Fragment>
      <TabContent activeTab={active}>
        {isCompanyAdmin && (
          <TabPane tabId={companyKey}>
            <Step1CompanyDetails />
          </TabPane>
        )}
        <TabPane tabId={accountKey}>
          <ProfileForm />
        </TabPane>
        <TabPane tabId={changePasswordKey}>
          <ChangePassword />
        </TabPane>
      </TabContent>
    </Fragment>
  );
};

export default TabContents;
