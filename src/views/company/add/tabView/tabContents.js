// ** React Imports
import { Fragment } from 'react';
import Index from '../index';
// ** Reactstrap Imports
import { TabPane, TabContent } from 'reactstrap';

import Address from '../address';



// import ChangePassword from '../changePassword'

const TabContents = ({
    active,
     EditKey,
  AddressKey,
    // addressKey
}) => {
    return (
        <Fragment>
            <TabContent activeTab={active}>
                <TabPane tabId={EditKey}>
                    <Index />
                </TabPane>

                <TabPane tabId={AddressKey}>
                    <Address />
                </TabPane>
               
             
            </TabContent>
        </Fragment>
    )
}

export default TabContents;
