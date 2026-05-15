import { Fragment } from "react";
import { Check } from "react-feather";
import classnames from "classnames";

const WizardHeader = ({ steps, activeStep, visited, onStepClick, isEdit }) => {
  return (
    <div className="wizard-stepper">
      {steps.map((s, i) => {
        const isActive = i === activeStep;
        const isDone = visited.has(i) && i < activeStep;
        // Edit mode: any step is clickable. Create mode: only visited ones.
        const isClickable = isEdit || visited.has(i);
        const Icon = s.icon;
        return (
          <Fragment key={s.key}>
            <div
              className={classnames("wizard-step", {
                active: isActive,
                done: isDone,
                clickable: isClickable,
              })}
              onClick={() => isClickable && onStepClick(i)}
            >
              <div className="step-circle">
                {isDone ? <Check size={18} /> : Icon ? <Icon size={16} /> : i + 1}
              </div>
              <div className="step-label">
                <div className="step-index">Step {i + 1}</div>
                <div className="step-title">{s.label}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={classnames("step-connector", {
                  done: visited.has(i + 1) || i < activeStep,
                })}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

export default WizardHeader;
