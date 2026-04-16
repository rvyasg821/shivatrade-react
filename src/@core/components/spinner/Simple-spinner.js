// ** Reactstrap Imports
import { Spinner } from "reactstrap"

// ** Constant
import { loaderColor } from "@constant/defaultValues"

import loader from "@src/assets/images/loader/loader.png";
import { useSelector } from "react-redux";
// import { useEffect } from "react";
const SimpleSpinner = ({ color = "", className = "" }) => {
  const isLoading = useSelector((state) => state.globalloading.isLoadingGlobally);

  if (!isLoading) return null
  return (
    <div
      className={`${className ||
        "loadercontent d-flex justify-content-center align-items-center position-fixed top-0 left-0 right-0 h-100 w-100"
        }`}
    >
      
      <Spinner color={color || loaderColor} />
    </div>
  )
}

export default SimpleSpinner
