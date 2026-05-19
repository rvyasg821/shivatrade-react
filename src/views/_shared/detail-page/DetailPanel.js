// Titled Card wrapper with optional right-aligned action node.

import { Card, CardBody } from "reactstrap";

const DetailPanel = ({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
  fill = false,
}) => {
  return (
    <Card
      className={`mb-1 ${fill ? "h-100" : ""} ${className}`}
      style={fill ? { display: "flex", flexDirection: "column" } : undefined}
    >
      <CardBody
        className={bodyClassName}
        style={
          fill
            ? { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }
            : undefined
        }
      >
        {(title || action) && (
          <div className="d-flex justify-content-between align-items-center mb-1">
            {title ? <h4 className="mb-0">{title}</h4> : <span />}
            {action ? <div>{action}</div> : null}
          </div>
        )}
        {fill ? (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
};

export default DetailPanel;
