import { Fragment, useState } from "react";
import { Card, CardBody, TabContent, TabPane } from "reactstrap";

import Tabs from "./tabs";
import PriceListTab from "./PriceListTab";
import PurchaseOrdersTab from "./PurchaseOrdersTab";
import ContactsTab from "./ContactsTab";
import AddressesTab from "./AddressesTab";
import BankAccountsTab from "./BankAccountsTab";
import LedgerTab from "./LedgerTab";

// `active` / `setActive` can be controlled by the parent (so the KPI cards can
// jump to a tab); falls back to internal state when used standalone.
const VendorTabView = ({ active: activeProp, setActive: setActiveProp }) => {
  const [activeLocal, setActiveLocal] = useState("price_list");
  const active = activeProp ?? activeLocal;
  const setActive = setActiveProp ?? setActiveLocal;
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
            <TabPane tabId="contacts">
              <ContactsTab />
            </TabPane>
            <TabPane tabId="addresses">
              <AddressesTab />
            </TabPane>
            <TabPane tabId="bank_accounts">
              <BankAccountsTab />
            </TabPane>
            <TabPane tabId="ledger">
              {active === "ledger" && <LedgerTab />}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default VendorTabView;
