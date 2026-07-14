// SaaS Tracking console — platform-owner view of every company.
//
// Three tabs over the data Phases 1–4 collect:
//   Activity   → audit_logs, as sentences with field-level diffs
//   API Calls  → api_call_logs, with latency/error stat tiles
//   Usage      → usage_daily_rollups, per-company per-day metering
//
// Access is enforced in THREE places, and only the last one matters:
//   1. the menu item carries `adminOnly: true` (cosmetic)
//   2. the route is permission-gated (cosmetic)
//   3. every /admin/tracking/* endpoint 403s unless roleName === 'Admin'
// Hiding a menu is not security. The 403 is.

import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Button,
} from "reactstrap";
import { RefreshCw, Activity, Server, BarChart2 } from "react-feather";
import { useTranslation } from "react-i18next";

import Notification from "@components/toast/notification";
import { cleanTrackingLogsMessage } from "./store";
import ActivityTab from "./tabs/ActivityTab";
import ApiCallsTab from "./tabs/ApiCallsTab";
import UsageTab from "./tabs/UsageTab";

const TABS = [
  { key: "activity", label: "Activity", icon: Activity },
  { key: "api-calls", label: "API Calls", icon: Server },
  { key: "usage", label: "Usage", icon: BarChart2 },
];

const TrackingLogs = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingLogs);

  const [active, setActive] = useState("activity");
  // Bumping this re-runs the active tab's loader without each tab having to
  // expose an imperative handle.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanTrackingLogsMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.success, store?.error]);

  return (
    <Fragment>
      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-1">
          <div>
            <CardTitle tag="h4" className="mb-25">
              {t("Activity Log")}
            </CardTitle>
            <small className="text-muted">
              {t(
                "Every change and every request, across all companies. Changes kept 90 days; API calls cleared nightly."
              )}
            </small>
          </div>
          <Button
            color="secondary"
            outline
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw size={14} className="me-50" />
            {t("Refresh")}
          </Button>
        </CardHeader>

        <CardBody>
          <Nav tabs className="mb-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavItem key={tab.key}>
                  <NavLink
                    className="cursor-pointer"
                    active={active === tab.key}
                    onClick={() => setActive(tab.key)}
                  >
                    <Icon size={14} className="me-50" />
                    {t(tab.label)}
                  </NavLink>
                </NavItem>
              );
            })}
          </Nav>

          {/* Mounted lazily: an inactive tab must not fire its queries. */}
          <TabContent activeTab={active}>
            <TabPane tabId="activity">
              {active === "activity" && <ActivityTab reloadKey={reloadKey} />}
            </TabPane>
            <TabPane tabId="api-calls">
              {active === "api-calls" && <ApiCallsTab reloadKey={reloadKey} />}
            </TabPane>
            <TabPane tabId="usage">
              {active === "usage" && <UsageTab reloadKey={reloadKey} />}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default TrackingLogs;
