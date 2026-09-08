// Shared "back to Reports" button for every individual report page's
// header — reports have no detail-drawer chrome of their own, so this is
// the only way back to the Reports card grid short of the sidebar. Same
// solid-primary, icon-only shape as the Back button on edit forms (e.g.
// categories/add/index.js).
import { useNavigate } from "react-router-dom";
import { Button } from "reactstrap";
import { ArrowLeft } from "react-feather";
import { useTranslation } from "react-i18next";
import { appsRoot } from "@constant/defaultValues";

const ReportBackButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      className="ms-2 btn-primary"
      onClick={() => navigate(`${appsRoot}/reports`)}
      title={t("Back to Reports")}
    >
      <ArrowLeft size={17} />
    </Button>
  );
};

export default ReportBackButton;
