// ** React Imports
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// ** Custom Hooks
import { useSkin } from "@hooks/useSkin";

// ** Third Party Components
import classnames from "classnames";
import UserHeader from "./components/customerheader/index";
import UserFooter from "./components/customerfooter/index";
import "../assets/front.scss";
import "../assets/progressbar.scss";

const UserLayout = () => {
  // ** States
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();

  // Get the full current URL
  const currentUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;

  // Check if the word "booking" is present in the URL path
  const isBookingPresent = currentUrl.toLowerCase().includes("booking");
  // ** Hooks
  const { skin } = useSkin();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    // <div
    //   className={classnames("blank-page", {
    //     "dark-layout": skin === "dark",
    //   })}
    // >
    <div
      className={classnames(isBookingPresent ? "front booking blank-page" : "front blank-page", {
        "dark-layout": skin === "dark",
      })}
      
    >

      {/* <UserHeader /> */}
      {!isBookingPresent && <UserHeader />}
      <div className="content">
        <div className="content-wrapper">
          <div className="content-body">
            <Outlet />
          </div>
        </div>
      </div>
      {/* <UserFooter /> */}
      {!isBookingPresent && <UserFooter />}
    </div>
  );
};

export default UserLayout;
