import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, TabContent, TabPane } from "reactstrap";
import { ArrowLeft } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import Tabs from "./tabs";
import AddressesTab from "./AddressesTab";
import ContactsTab from "./ContactsTab";
import QuotationsTab from "./QuotationsTab";
import PfisTab from "./PfisTab";

const CustomerTabView = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("addresses");
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
          onClick={() => navigate(`${appsRoot}/customers`)}
        >
          <ArrowLeft size={17} />
        </Button>
      </div>
      <Card>
        <CardBody>
          <TabContent activeTab={active}>
            <TabPane tabId="addresses">
              <AddressesTab />
            </TabPane>
            <TabPane tabId="contacts">
              <ContactsTab />
            </TabPane>
            <TabPane tabId="quotations">
              <QuotationsTab />
            </TabPane>
            <TabPane tabId="pfis">
              <PfisTab />
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default CustomerTabView;
