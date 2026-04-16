// ** Constant
import { appBaseName } from "@constant/defaultValues"
import { useTranslation } from "react-i18next"
const Footer = () => {
    const { t } = useTranslation()

  return (
    // <div className="container-xxl">
      <div className="row">
         <div className="col-lg-6">
          <p className='clearfix mb-0 text-center text-lg-end'>
            {/* float-md-start  */}
            <span className='d-block d-md-inline-block w-100 text-center text-md-start'>
              COPYRIGHT © {new Date().getFullYear()}{' '} {appBaseName}
              <span className='d-none d-sm-inline-block'>, All Rights Reserved</span>
            </span>
            {/* <span className='float-md-end d-none d-md-block'>
            </span> */}
          </p>
      </div>
        <div className="col-lg-6 d-flex justify-content-center justify-content-md-end">
          
          <ul className="list-unstyled mb-0">
            <li>
              <a href="" target="_blank">Privacy & Policy</a>
            </li>
            <li>
              <a href="" target="_blank">Terms & Conditions</a>
            </li>
          </ul>
        </div>
          
      </div>
      
    // </div>
    
  )
}

export default Footer
