import { Card, CardBody } from "reactstrap";

const DetailKpiCard = ({ label, value, sub, icon: Icon, tone = "primary" }) => {
  return (
    <Card className="mb-1 h-100">
      <CardBody className="d-flex align-items-center py-1">
        {Icon ? (
          <div
            className={`avatar avatar-stats p-50 m-0 me-1 bg-light-${tone}`}
            style={{ color: "#000" }}
          >
            <div className="avatar-content" style={{ color: "#000" }}>
              <Icon size={20} color="#000" />
            </div>
          </div>
        ) : null}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <h4 className="mb-0 text-break" style={{ overflowWrap: "anywhere" }}>
            {value ?? "-"}
          </h4>
          <div className="text-muted small">{label}</div>
          {sub ? (
            <div className={`small text-${tone}`}>{sub}</div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
};

export default DetailKpiCard;
