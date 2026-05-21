import { Fragment, useState } from "react";
import { Card, CardBody, TabContent, TabPane } from "reactstrap";

import Tabs from "./tabs";
import PriceListTab from "./PriceListTab";
import PurchaseOrdersTab from "./PurchaseOrdersTab";

const VendorTabView = () => {
  const [active, setActive] = useState("price_list");
  const toggleTab = (tab) => {
    if (active !== tab) setActive(tab);
  };

  return (
    <Fragment>
      <Tabs active={active} toggleTab={toggleTab} />
      <Card>
        <CardBody>
          <TabContent activeTab={active}>
            <TabPane tabId="price_list">
              <PriceListTab />
            </TabPane>
            <TabPane tabId="purchase_orders">
              <PurchaseOrdersTab />
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default VendorTabView;
