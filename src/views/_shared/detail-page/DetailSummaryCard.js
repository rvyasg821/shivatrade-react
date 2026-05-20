// Two-column summary card with an optional collapsible brief below.

import { useState } from "react";
import { Card, CardBody, Row, Col, Button } from "reactstrap";
import { ChevronDown, ChevronUp } from "react-feather";

const BRIEF_CLAMP_CHARS = 280;

const DetailSummaryCard = ({
  title,
  left,
  right,
  brief,
  briefLabel = "Brief",
  footer,
  split = { md: 6, lg: 6 },
}) => {
  const [open, setOpen] = useState(false);
  const briefStr = typeof brief === "string" ? brief : "";
  const isLong = briefStr.length > BRIEF_CLAMP_CHARS;
  const shown = !isLong || open ? briefStr : briefStr.slice(0, BRIEF_CLAMP_CHARS).trim() + "…";

  return (
    <Card className="mb-1">
      <CardBody>
        {title ? (
          <h4 className="fw-bolder mb-1">{title}</h4>
        ) : null}

        <Row>
          {left ? (
            <Col xs="12" md={split.md} lg={split.lg}>
              {left}
            </Col>
          ) : null}
          {right ? (
            <Col xs="12" md={split.md} lg={split.lg}>
              {right}
            </Col>
          ) : null}
        </Row>

        {brief ? (
          <div className="mt-1 pt-1 border-top">
            <div className="text-muted small mb-50">{briefLabel}</div>
            <div
              className="text-break"
              style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
            >
              {shown || "-"}
            </div>
            {isLong ? (
              <Button
                color="link"
                size="sm"
                className="ps-0"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? (
                  <>
                    <ChevronUp size={14} className="me-25" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} className="me-25" /> Show more
                  </>
                )}
              </Button>
            ) : null}
          </div>
        ) : null}

        {footer ? <div className="mt-1">{footer}</div> : null}
      </CardBody>
    </Card>
  );
};

export default DetailSummaryCard;
