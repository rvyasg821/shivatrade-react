import { Fragment } from 'react';
import { useSelector } from 'react-redux';

import ProfileForm from '../profileForm';
import ChangePassword from '../changePassword';
import Step1CompanyDetails from '../editCompany/Step1CompanyDetails';

const TabContents = ({ active, accountKey, changePasswordKey, companyKey, addressKey, bankKey }) => {
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name?.toLowerCase() || "";
  const isCompanyAdmin = roleName === "company admin";

  // Company / Address / Bank tabs are three sections of ONE company form.
  // Rendering a single <Step1CompanyDetails> at a stable position keeps the
  // form mounted while switching between them, so edits in any section persist
  // and a single Save writes the whole company.
  const isCompanySection = [companyKey, addressKey, bankKey].includes(active);
  const section =
    active === addressKey ? "address" : active === bankKey ? "bank" : "company";

  return (
    <Fragment>
      {isCompanyAdmin && isCompanySection && (
        <Step1CompanyDetails section={section} />
      )}
      {active === accountKey && <ProfileForm />}
      {active === changePasswordKey && <ChangePassword />}
    </Fragment>
  );
};

export default TabContents;
