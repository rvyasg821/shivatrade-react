// ** React Imports
import { Fragment } from 'react'

// ** Reactstrap Imports
import { TabPane, TabContent } from 'reactstrap'
import DynamicSettingForm from './DynamicSettingForm'
// import ChangePassword from './changePassword'
import settingsConfig from "./settingsConfig";

const TabContents = ({
    active,
    data,
    dynamicData, // Dynamic data for settings
    selectedMainTab,
    dynamicMainTab, // Dynamic main tab data
}) => {
    const selectedTab = data.find(item => item.group === active);
    const dynamicSelectedTab = dynamicData?.find(item => item.group === active);

    

    return (
        <Fragment>
            <TabContent activeTab={active}>
                {selectedTab && (
                    <TabPane tabId={active}>
                        <DynamicSettingForm
                            data={selectedTab}
                            active={active}
                            id={selectedMainTab._id}
                            dynamicData={dynamicSelectedTab}
                            selectedMainTab={selectedMainTab}
                            dynamicMainTab={dynamicMainTab}
                        />
                    </TabPane>
                )}
            </TabContent>
        </Fragment>
    )
}

export default TabContents
