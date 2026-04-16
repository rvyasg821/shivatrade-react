// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { cleanAuthMessage } from "@src/views/auth/store";
import { startLoading, stopLoading } from "../../loadingstore";
import { getCompanyDetails } from "./editCompany/store";

// ** Reactstrap Imports
import { Col, Row,Spinner } from 'reactstrap';

// ** Custom Components
import Notification from "@components/toast/notification";
import UserInfoCard from "./userInfoCard";
import CompanyInfoCard from "../../../views/company/CompanyInfoCard";

import ProfileTabView from "./tabView";
import CompanyTabView from "./editCompany/tabView/index";

// ** Styles
import '@styles/react/apps/app-users.scss'


const Profile = () => {
    // ** Store vars
    const dispatch = useDispatch();
    const store = useSelector((state) => state.auth);

    useEffect(() => {
        /* For blank message api called inside */
        if (store?.actionFlag || store?.success || store?.error) {
            //  Notification("abc");
            dispatch(cleanAuthMessage(null))
        }

        /* Success toast notification */
        if (store?.success) {
            // Notification("Success", store.success, "success")
        }

        /* Error toast notification */
        if (store?.error) {
            Notification("Error", store.error, "warning")
        }
    }, [store.actionFlag, store.success, store.error])
// loadding 
    useEffect(() => {
        if (!store?.loading) {
            
            dispatch(startLoading())
        } else {
           
            dispatch(stopLoading())
        }
    }, [store?.loading])

    // permission check
  const roleName = store?.authUserItem?.role?.name?.toLowerCase() || "";
  const isUser=store?.authUserItem?.isSystemUser===true;

  // Only Company Admin can manage subscriptions - all other roles see personal profile only
  const isCompanyAdmin = roleName === "company admin";
  const isSuperAdmin = roleName === "super admin" || roleName === "admin";

    // Fetch company data for all company-level roles (Company Admin, Location Admin, Employee, custom roles)
    useEffect(() => {
        if (!isSuperAdmin && !isUser) {
            dispatch(getCompanyDetails());
        }
    }, [isSuperAdmin, isUser, dispatch]);
    if (!store?.loading || !store?.authUserItem) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "70vh" }}
      >
        <Spinner color="primary" />
      </div>
    );
  }
    return (
        <Fragment>
            {/* {!store?.loading ? (
                <SimpleSpinner />
            ) : null} */}

            <div className="app-user-view">
                <Row>
                    {/*  xs={{ order: 1 }} */}
                    <Col xl={4} lg={5} md={{ order: 0, size: 5 }}>
                        <UserInfoCard user={store?.authUserItem} />
                    </Col>

                    {/*  xs={{ order: 0 }} */}
                    <Col xl={8} lg={7} md={{ order: 1, size: 7 }}>
                        {isCompanyAdmin && !isUser ? (
                            <CompanyTabView />
                        ) : (
                            <ProfileTabView />
                        )}
                    </Col>
                    
                </Row>
            </div>
        </Fragment>
    )
}

export default Profile
