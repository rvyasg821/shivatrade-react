import { Row, Col } from "reactstrap";
import DetailKpiCard from "./DetailKpiCard";

const DetailKpiStrip = ({ items = [], cols = { md: 6, lg: 3 } }) => {
  if (!items.length) return null;
  return (
    <Row className="match-height">
      {items.map((it, idx) => (
        <Col key={it.key || idx} xs="12" md={cols.md} lg={cols.lg}>
          <DetailKpiCard {...it} />
        </Col>
      ))}
    </Row>
  );
};

export default DetailKpiStrip;
