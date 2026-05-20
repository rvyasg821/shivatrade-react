// Two side-by-side panels with configurable ratio. Stacks on small screens.

import { Row, Col } from "reactstrap";

const RATIO_TO_COLS = {
  "7-5": { l: 7, r: 5 },
  "6-6": { l: 6, r: 6 },
  "8-4": { l: 8, r: 4 },
  "5-7": { l: 5, r: 7 },
  "9-3": { l: 9, r: 3 },
  "10-2": { l: 10, r: 2 },
};

const DetailTwoPanel = ({ left, right, ratio = "7-5", matchHeight = false }) => {
  const { l, r } = RATIO_TO_COLS[ratio] || RATIO_TO_COLS["7-5"];
  return (
    <Row className={matchHeight ? "match-height" : ""}>
      <Col xs="12" lg={l}>
        {left}
      </Col>
      <Col xs="12" lg={r}>
        {right}
      </Col>
    </Row>
  );
};

export default DetailTwoPanel;
