// ** React Imports
import { Fragment } from 'react';
import Step1CompanyDetails from '../companyDetails';
// ** Reactstrap Imports
import { TabPane, TabContent } from 'reactstrap';

import Payment from '../payment';



// import ChangePassword from '../changePassword'

const TabContents = ({
    active,
    accountKey,
    changePasswordKey,
    // addressKey
}) => {
    return (
        <Fragment>
            <TabContent activeTab={active}>
                <TabPane tabId={accountKey}>
                    <Step1CompanyDetails />
                </TabPane>

                <TabPane tabId={changePasswordKey}>
                    <Payment />
                </TabPane>
             
            </TabContent>
        </Fragment>
    )
}

export default TabContents;
