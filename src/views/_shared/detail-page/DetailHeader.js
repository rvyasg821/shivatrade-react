// Sticky header strip for any record detail page.
// Props are intentionally generic — pass display strings + action descriptors.

import { Fragment } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  UncontrolledTooltip,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import { MoreVertical } from "react-feather";

import Avatar from "@components/avatar";

const renderAction = (a, idx) => {
  if (a?.hidden) return null;
  const Icon = a.icon;
  const id = a.id || `dp-hdr-act-${idx}`;
  const inner = (
    <>
      {Icon ? <Icon size={14} className={a.label ? "me-50" : ""} /> : null}
      {a.label || null}
    </>
  );
  const common = {
    color: a.color || "primary",
    outline: a.outline ?? true,
    size: "sm",
    id,
    className: "d-flex align-items-center",
  };
  return (
    <Fragment key={id}>
      {a.href ? (
        <Button {...common} tag="a" href={a.href} target={a.target || "_self"} rel="noopener noreferrer">
          {inner}
        </Button>
      ) : (
        <Button {...common} onClick={a.onClick} disabled={a.disabled}>
          {inner}
        </Button>
      )}
      {a.tooltip ? (
        <UncontrolledTooltip target={id} placement="top">
          {a.tooltip}
        </UncontrolledTooltip>
      ) : null}
    </Fragment>
  );
};

const DetailHeader = ({
  avatarText,
  avatarColor = "light-primary",
  title,
  subtitle,
  meta,
  badge,
  actions = [],
  moreActions = [],
  belowSlot,
  sticky = true,
  className = "",
}) => {
  const initials = (avatarText || title || "?")
    .toString()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const visibleMore = moreActions.filter((a) => !a?.hidden);

  return (
    <Card
      className={`mb-1 ${className}`}
      style={
        sticky
          ? { position: "sticky", top: 0, zIndex: 5 }
          : undefined
      }
    >
      <CardBody className="py-1">
        <div className="d-flex align-items-center flex-wrap gap-1">
          <Avatar
            initials
            color={avatarColor}
            className="rounded"
            content={initials || "?"}
            contentStyles={{
              borderRadius: 0,
              fontSize: "calc(18px)",
              width: "100%",
              height: "100%",
            }}
            style={{ height: "56px", width: "56px" }}
          />

          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center flex-wrap">
              <h4
                className="mb-0 text-capitalize text-break me-1"
                style={{ overflowWrap: "anywhere" }}
              >
                {title || "-"}
              </h4>
              {badge ? (
                <Badge
                  color={`light-${badge.color || "secondary"}`}
                  className="text-capitalize"
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.45rem 0.75rem",
                    letterSpacing: "0.3px",
                  }}
                >
                  {badge.label}
                </Badge>
              ) : null}
            </div>
            {subtitle ? (
              <div
                className="text-muted small text-break"
                style={{ overflowWrap: "anywhere" }}
              >
                {subtitle}
              </div>
            ) : null}
            {meta ? (
              <div className="text-muted small">{meta}</div>
            ) : null}
          </div>

          <div className="d-flex align-items-center gap-1 flex-wrap">
            {actions.map(renderAction)}
            {visibleMore.length > 0 && (
              <UncontrolledDropdown>
                <DropdownToggle color="secondary" outline size="sm" caret={false}>
                  <MoreVertical size={14} />
                </DropdownToggle>
                <DropdownMenu end>
                  {visibleMore.map((a, idx) => (
                    <DropdownItem
                      key={`dp-hdr-more-${idx}`}
                      tag="a"
                      href={a.href || "#"}
                      onClick={(e) => {
                        if (!a.href) e.preventDefault();
                        if (a.onClick) a.onClick(e);
                      }}
                      disabled={a.disabled}
                      className="d-flex align-items-center w-100"
                    >
                      {a.icon ? <a.icon size={14} className="me-50" /> : null}
                      <span>{a.label}</span>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </UncontrolledDropdown>
            )}
          </div>
        </div>

        {belowSlot ? <div className="mt-1">{belowSlot}</div> : null}
      </CardBody>
    </Card>
  );
};

export default DetailHeader;
