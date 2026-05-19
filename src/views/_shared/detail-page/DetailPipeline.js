// Visual, read-only pipeline stepper. Pass steps[] + current value.
// steps: [{ value, label }]; "terminal" steps (e.g. lost) render to the right as a chip.

import { Check } from "react-feather";

const DetailPipeline = ({
  steps = [],
  current,
  terminalSteps = [],
  className = "",
}) => {
  const isTerminalCurrent = terminalSteps.some((s) => s.value === current);
  const currentIndex = steps.findIndex((s) => s.value === current);

  return (
    <div
      className={`d-flex align-items-center flex-wrap gap-1 ${className}`}
    >
      <div className="d-flex align-items-center flex-grow-1 flex-wrap">
        {steps.map((step, idx) => {
          const isDone = !isTerminalCurrent && idx < currentIndex;
          const isActive = !isTerminalCurrent && idx === currentIndex;
          const dotBg = isDone
            ? "var(--bs-success)"
            : isActive
            ? "var(--bs-primary)"
            : "var(--bs-secondary)";
          const lineBg = isDone ? "var(--bs-success)" : "#e9ecef";
          return (
            <div
              key={step.value}
              className="d-flex align-items-center"
              style={{ minWidth: 0 }}
            >
              <div
                className="d-flex align-items-center justify-content-center text-white fw-bold"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: dotBg,
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {isDone ? <Check size={12} /> : idx + 1}
              </div>
              <span
                className={`ms-50 small ${
                  isActive ? "fw-bold" : "text-muted"
                }`}
                style={{ whiteSpace: "nowrap" }}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className="mx-1"
                  style={{
                    width: 28,
                    height: 2,
                    background: lineBg,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {terminalSteps
        .filter((step) => step.value === current)
        .map((step) => (
          <span
            key={step.value}
            className={`badge bg-${step.color || "danger"} text-capitalize`}
          >
            {step.label}
          </span>
        ))}
    </div>
  );
};

export default DetailPipeline;
