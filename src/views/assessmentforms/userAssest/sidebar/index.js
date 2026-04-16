// ** Logo
import logoImage from "@src/assets/images/logo/sidebar-logo.png";
import { useTranslation } from "react-i18next";
import { Outlet, Link } from "react-router-dom";

const steps = [
  { id: 1, label: "Company Information", path: "companyinformation" },
  { id: 2, label: "Assessment Report", path: "assessmentreport" },
  { id: 3, label: "Thank You", path: "thankyou" },
];

const AssessmentSidebar = ({

}) => {
  const { t } = useTranslation();

  const getActiveStep = () => {
    const found = steps.find((s) => location.pathname.includes(`/${s.path}`));
    return found ? found.id : 1;
  };

  const activeStep = getActiveStep();

  return (
    <div className="wizard-container custome-wizard-main">

      <aside className="wizard-sidebar">
        <img src={logoImage} alt="AmazonEDGE" className="logo" />
        <ul className="steps">
          {steps.map((step) => (
            <li
              key={step.id}
              className={`
                ${step.id === activeStep ? "active" : ""} 
                ${step.id > activeStep ? "pending disabled" : ""}
              `}
            >
              <Link
                to={step.path}
                className="step-link"
                onClick={(e) => {
                  if (step.id > activeStep) e.preventDefault();
                }}
              >
                <div className="circle-main">
                  <p className="circle">{step.id}</p>
                </div>
                <span className="step-name">{t(step.label)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main step content */}
      <main className="wizard-content">
        <Outlet />
      </main>
    </div>


  )
}

export default AssessmentSidebar;
