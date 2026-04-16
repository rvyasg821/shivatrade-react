import { Fragment, useEffect, useState } from "react";
import { TabPane, TabContent } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import Step1CompanyDetails from "../Step1CompanyDetails";
import SubscriptionDetails from "../subscription";
import Payment from "../payment";
import { getCompanyPaymentList } from "@src/views/payment/store/";

const TabContents = ({ active, accountKey, subscriptionKey, paymentKey, toggleTab }) => {
  const dispatch = useDispatch();
  const authStore = useSelector((state) => state.company);
  const customerId = authStore?._id;

  // Local states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // ** Fetch Payments when Payment tab is active
  useEffect(() => {
    if (active === paymentKey) {
      dispatch(
        getCompanyPaymentList({
          customer: customerId,
          page: currentPage,
          perPage: rowsPerPage,
          orderBy: sortColumn,
          orderDirection: sortDirection,
        })
      );
    }
  }, [
    active,
    dispatch,
    paymentKey,
    customerId,
    currentPage,
    rowsPerPage,
    sortColumn,
    sortDirection,

  ]);

  return (
    <Fragment>
      <TabContent activeTab={active}>


        <TabPane tabId={subscriptionKey}>
          <SubscriptionDetails
            activeTab={active}
            subscriptionKey={subscriptionKey}
          />
        </TabPane>

        <TabPane tabId={paymentKey}>
          <Payment
            activeTab={active}
            paymentKey={paymentKey}
            currentPages={currentPage}
            rowsPerPages={rowsPerPage}
            setCurrentPages={setCurrentPage}
            setRowsPerPages={setRowsPerPage}
            setSortdirec={setSortDirection}
            setSortcolumn={setSortColumn}
          />
        </TabPane>
      </TabContent>
    </Fragment>
  );
};

export default TabContents;
