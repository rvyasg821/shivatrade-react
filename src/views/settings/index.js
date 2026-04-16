import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSettingList } from './store';
import DynamicSettingForm from './DynamicSettingForm';
import {
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Spinner,
} from 'reactstrap';
import classnames from 'classnames';

const groupSettingsByKey = (items) => {
  const grouped = {};
  items.forEach((item) => {
    const [group] = item.key.split('.'); // e.g. smtp.email -> smtp
    if (!grouped[group]) grouped[group] = {};
    grouped[group] = { ...grouped[group], ...item.value };
  });
  return grouped;
};

const Settings = () => {
  const dispatch = useDispatch();
  const { settingItem, loading, error } = useSelector((state) => state.setting);

  const [activeTab, setActiveTab] = useState('general');
  const [groupedSettings, setGroupedSettings] = useState({});

  useEffect(() => {
    dispatch(getSettingList());
  }, [dispatch]);

  useEffect(() => {
    if (settingItem?.length) {
      setGroupedSettings(groupSettingsByKey(settingItem));
    }
  }, [settingItem]);

  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const tabs = ['general', 'smtp', 'payment'];

  // Show spinner while loading
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '200px' }}
      >
        <Spinner
          color="primary"
          style={{ width: '6rem', height: '6rem', marginTop: '10px' }}
        />
      </div>
    );
  }

  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <Nav tabs>
        {tabs.map((tab) => (
          <NavItem key={tab}>
            <NavLink
              className={classnames({ active: activeTab === tab })}
              onClick={() => toggle(tab)}
              style={{ cursor: 'pointer' }}
            >
              {tab.toUpperCase()}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      <TabContent activeTab={activeTab} className="p-2">
        {tabs.map((tab) => (
          <TabPane tabId={tab} key={tab}>
            <DynamicSettingForm
              group={tab}
              values={groupedSettings[tab] || {}}
            />
          </TabPane>
        ))}
      </TabContent>
    </div>
  );
};

export default Settings;
