import { Inbox } from "react-feather";
import { Button } from "reactstrap";

const DetailEmptyState = ({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  cta,
}) => {
  return (
    <div className="text-center py-3">
      <Icon size={28} className="text-muted mb-1" />
      <div className="fw-bold">{title}</div>
      {description ? (
        <div className="text-muted small mb-1">{description}</div>
      ) : null}
      {cta ? (
        <Button color="primary" size="sm" onClick={cta.onClick}>
          {cta.icon ? <cta.icon size={14} className="me-50" /> : null}
          {cta.label}
        </Button>
      ) : null}
    </div>
  );
};

export default DetailEmptyState;
