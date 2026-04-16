// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { cleanAuthMessage } from "@src/views/auth/store";
import { startLoading, stopLoading } from "../loadingstore";
import {
  appsRoot,

} from "@constant/defaultValues";
// ** Reactstrap Imports
import { Col, Row } from 'reactstrap';

// ** Custom Components
import Notification from "@components/toast/notification";
import CompanyInfoCard from "./CompanyInfoCard";
import ProfileTabView from "@src/views/company/tabView/";


// ** Styles
import '@styles/react/apps/app-users.scss'
import { useLocation, useParams } from "react-router-dom";


const Company = () => {
  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const { id } = useParams();
  const location = useLocation();

  useEffect(() => {
    // Reset messages
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanAuthMessage(null));
    }

    // Success toast notification
    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    // Error toast notification
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);


  return (
    <>

        <Fragment>
          <div className="app-user-view">
            <Row>
              <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
                <CompanyInfoCard user={store?.authUserItem} />
              </Col>
              <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
                <ProfileTabView />
              </Col>
            </Row>
          </div>
        </Fragment>
    
    </>
  );
};

export default Company
