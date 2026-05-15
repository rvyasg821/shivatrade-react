import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, TabContent, TabPane } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import PriceListTab from "./PriceListTab";
import AddressesTab from "./AddressesTab";
import BankAccountsTab from "./BankAccountsTab";
import ContactsTab from "./ContactsTab";

const VendorTabView = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("price_list");
  const toggleTab = (tab) => {
    if (active !== tab) setActive(tab);
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-0">
        <Tabs active={active} toggleTab={toggleTab} />
        <Button
          type="button"
          color="primary"
          onClick={() => navigate(`${appsRoot}/vendors`)}
        >
          <ArrowLeft size={17} />
        </Button>
      </div>
      <Card>
        <CardBody>
          <TabContent activeTab={active}>
            <TabPane tabId="price_list">
              <PriceListTab />
            </TabPane>
            <TabPane tabId="addresses">
              <AddressesTab />
            </TabPane>
            <TabPane tabId="banks">
              <BankAccountsTab />
            </TabPane>
            <TabPane tabId="contacts">
              <ContactsTab />
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default VendorTabView;
