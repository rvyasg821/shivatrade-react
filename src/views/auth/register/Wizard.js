import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Step1CompanyDetails from "./Step1CompanyDetails";
import Step2Plan from "./Step2Plan";
import Step3Payment from "./Step3Payment";
import Step4PaymentProcess from "./Step4PaymentProcess";
import Step5ThankYou from "./Step5ThankYou";
import "./Wizard.scss";
import logoImage from "@src/assets/images/logo/sidebar-logo.png";
import Notification from '@src/@core/components/toast/notification';
import { Link, useNavigate } from "react-router-dom";
import { appsRoot } from "@constant/defaultValues";
import StepVerficationOtp from "./StepVerficationOtp";
import { useTranslation } from "react-i18next"
const Wizard = () => {

  const store = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { t } = useTranslation()

  // Redirect subscribed company admins away from register page
  useEffect(() => {
    const company = store?.authUserItem?.company;
    if (company && company.is_subscribe) {
      navigate(`${appsRoot}/dashboard`, { replace: true });
    }
  }, [store?.authUserItem?.company?.is_subscribe]);

  const [step, setStep] = useState(() => {
    const savedStep = localStorage.getItem("wizardStep");
    return savedStep ? Number(savedStep) : 1;
  });

  useEffect(() => {
    localStorage.setItem("wizardStep", step);
  }, [step]);

  useEffect(() => {
    const company = store?.authUserItem?.company;
    localStorage.setItem("registerItem", JSON.stringify(store.authUserItem));

    // Only update step if company exists and saved step < 2
    const savedStep = Number(localStorage.getItem("wizardStep") || 1);
    if (company && !company.is_subscribe && savedStep < 2) {
      setStep(2);
    }


    if (!company) return; // nothing to do if auth not loaded

    const existingData = JSON.parse(localStorage.getItem("registerFormData") || "{}");
    const updatedFormData = {
      ...existingData,
      company_name: company.company_name || existingData.company_name || "",
      fname: company.contact_first_name || existingData.fname || "",
      lname: company.contact_last_name || existingData.lname || "",
      email: company.email || existingData.email || "",
      mobile: company.mobile || existingData.mobile || "",
      country_code: company.country_code || existingData.country_code || { code: "+1", name: "United States" },
      userId: store?.authUserItem?._id || existingData.userId || "",
      primaryEmail: company.email,
    };

    // Save back to localStorage without changing key name
    localStorage.setItem("registerFormData", JSON.stringify(updatedFormData));
  }, [store]);

  const { planSelection, registerItem, paymentItem } = useSelector(state => state.register);
  const dashboardUrl = `${appsRoot}/dashboard`;

  const nextStep = () => {

    if (step === 1) {
      // Validate company details before moving to plan selection
      if (!registerItem?._id) {
        // Notification("Warning", "Please complete company registration before proceeding", "warning");
        setStep(prev => prev + 1);
        return;
      }
    }

    if (step === 2) {
      // Validate plan selection before moving to payment
      if (!planSelection.selectedPlan) {
        // Notification("Warning", "Please select a plan before proceeding to payment", "warning");
        setStep(prev => prev + 1);
        return;
      }
    }

    if (step === 3) {
      // Payment step completed, proceed to payment process
      // This will be handled by the payment form submission
      navigate(dashboardUrl, { replace: true });
    }
    // setStep(step + 1);
    setStep(prev => prev + 1);

  };

  const prevStep = () => {
    // Prevent going back from payment process or thank you steps
    //This for Plan to CompanyDetails
    // if (step === 3) {
    //   setStep(1);
    //   return;
    // }

    if (step > 3) {
      return;
    }
    setStep(step - 1);
  };

  // Get step completion status
  const getStepStatus = (stepNumber) => {
    if (stepNumber < step) return 'completed';
    if (stepNumber === step) return 'active';
    return 'pending';
  };

  // Check if step can be accessed
  const canAccessStep = (stepNumber) => {
    // ✅ Always allow navigating to current or previous steps
    if (stepNumber <= step) return true;

    // ✅ Step 2 (Verification) → Allowed only after Company registration (registerItem._id)
    if (stepNumber === 2 && !registerItem?._id) {
      return false;
    }

    // ✅ Step 3 (Payment Info) → Requires company verification completion (step >= 2)
    if (stepNumber === 3 && step < 3) {
      return false;
    }

    // ✅ Step 4 (Payment Processing) → Requires payment info submitted (planSelection.selectedPlan)
    if (stepNumber === 4 && !planSelection.selectedPlan) {
      return false;
    }

    // ✅ Step 5 (Thank You) → Requires payment success (paymentItem.status)
    if (stepNumber === 5 && !paymentItem?.status) {
      return false;
    }
    return stepNumber <= step + 1;

  };

  return (
    <div className="wizard-container custome-wizard-main">
      {/* Sidebar with circle design */}
      <aside className="wizard-sidebar">
        <img src={logoImage} alt="AmazonEDGE" className="logo" />
     <h4 className="step-heading">{t("Register Your Business")}</h4>


        <ul className="steps">
          <li className={`${getStepStatus(1)} ${!canAccessStep(1) ? 'disabled' : ''}`}>
            <div className="circle-main"><p className="circle">1</p></div> <span className="step-name">{t("Company Details")}</span>
</li>
          {/* <li className={`${getStepStatus(2)} ${!canAccessStep(2) ? 'disabled' : ''}`}>
            <span className="circle">2</span> Verification (Email)

          </li> */}
          <li className={`${getStepStatus(2)} ${!canAccessStep(2) ? 'disabled' : ''}`}>
            <div className="circle-main"><p className="circle">2</p></div>   <span className="step-name">{t("Plan Selection")}</span>
          </li>
          <li className={`${getStepStatus(3)} ${!canAccessStep(3) ? 'disabled' : ''}`}>
            <div className="circle-main"><p className="circle">3</p></div> <span className="step-name">{t("Payment Information")}</span>
          </li>
          {/* <li className={`${getStepStatus(4)} ${!canAccessStep(4) ? 'disabled' : ''}`}>
            <span className="circle">4</span> Payment Processing

          </li> */}
          <li className={`${getStepStatus(4)} ${!canAccessStep(4) ? 'disabled' : ''}`}>
            <div className="circle-main"><p className="circle">4</p></div> <span className="step-name">{t("Completed")}</span>

          </li>
        </ul>
      </aside>

      <main className="wizard-content">
        {step === 1 && <Step1CompanyDetails nextStep={nextStep} />}
        {/* {step === 2 && <StepVerficationOtp nextStep={nextStep} step1Data={step1Data} prevStep={prevStep} />} */}
        {step === 2 && <Step2Plan nextStep={nextStep} prevStep={prevStep} />}
        {step === 3 && <Step3Payment nextStep={nextStep} prevStep={prevStep} />}
        {step === 4 && <Step4PaymentProcess nextStep={nextStep} />}
        {step === 5 && <Step5ThankYou />}
      </main>
    </div>
  );
};

export default Wizard;
