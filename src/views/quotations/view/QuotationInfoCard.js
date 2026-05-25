import { Fragment, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getQuotation } from "@src/views/quotations/store";
import { createPfiFromQuotation } from "@src/views/pfi/store";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Card,
  CardBody,
  Badge,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import {
  Hash,
  User,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  ExternalLink,
  Truck,
} from "react-feather";
import { useTranslation } from "react-i18next";

import Avatar from "@components/avatar";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { QUOTATION_STATUS_BADGE_COLOR } from "@constant/options";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";

const InfoRow = ({ icon: Icon, value }) => {
  if (!value) return null;
  return (
    <li className="d-flex align-items-start mb-50">
      <Icon size={14} className="me-50 mt-25 text-muted flex-shrink-0" />
      <span
        className="flex-grow-1 text-break"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </li>
  );
};

const QuotationInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const [poModalOpen, setPoModalOpen] = useState(false);
  const sym = q?.currency_symbol || q?.currency_code || "";

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const quotationPerms = authUserItem?.role?.permissions?.quotations;
  const poPerms = authUserItem?.role?.permissions?.["purchase-orders"];
  const pfiPerms = authUserItem?.role?.permissions?.pfi;
  const canEdit =
    isAdmin || quotationPerms?.can_all || quotationPerms?.can_update;
  const canGeneratePo = isAdmin || poPerms?.can_all || poPerms?.can_add;
  const canConvertToPfi = isAdmin || pfiPerms?.can_all || pfiPerms?.can_add;

  const mySwal = withReactContent(Swal);
  const handleConvertToPfi = () => {
    mySwal
      .fire({
        title: t("Convert to PFI?"),
        text: t(
          "A new PFI will be created from this quotation with all line items, expenses and rebates copied over."
        ),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("Yes, convert"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(createPfiFromQuotation(id))
          .unwrap()
          .then((res) => {
            const newId = res?.pfiItem?._id;
            Notification(
              "Success",
              res?.success || t("PFI created"),
              "success"
            );
            if (newId) navigate(`${appsRoot}/pfi/edit/${newId}`);
          })
          .catch((err) =>
            Notification("Error", err || t("Conversion failed"), "warning")
          );
      });
  };

  return (
    <Fragment>
      <Card>
        <CardBody>
          <div className="user-avatar-section">
            <div className="d-flex align-items-center flex-column">
              <Avatar
                initials
                color="light-primary"
                className="rounded mt-3 mb-2"
                content={"Q"}
                contentStyles={{
                  borderRadius: 0,
                  fontSize: "calc(36px)",
                  width: "100%",
                  height: "100%",
                }}
                style={{ height: "90px", width: "90px" }}
              />
              <div className="d-flex flex-column align-items-center text-center">
                <h4 className="text-break mb-0">{q?.voucher_no || "-"}</h4>
                <Badge
                  color={`light-${
                    QUOTATION_STATUS_BADGE_COLOR[
                      (q?.status || "").toLowerCase()
                    ] || "secondary"
                  }`}
                  className={`badge-light-${
                    QUOTATION_STATUS_BADGE_COLOR[
                      (q?.status || "").toLowerCase()
                    ] || "secondary"
                  } mt-1 text-capitalize`}
                >
                  {q?.status || "-"}
                </Badge>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1">
            {t("Details")}
          </h4>
          <ul className="list-unstyled mb-2">
            <InfoRow icon={User} value={q?.customer_name} />
            <InfoRow
              icon={Calendar}
              value={
                q?.quotation_date
                  ? `${q.quotation_date.slice(0, 10)}${
                      q?.valid_until
                        ? ` → ${q.valid_until.slice(0, 10)}`
                        : ""
                    }`
                  : null
              }
            />
            <InfoRow
              icon={DollarSign}
              value={
                q?.grand_total
                  ? `${sym}${fmt(q.grand_total)} (${q?.currency_code || ""})`
                  : null
              }
            />
            <InfoRow
              icon={FileText}
              value={
                q?.lead_id ? (
                  <span className="d-inline-flex align-items-center">
                    {t("Source Lead")}
                    <a
                      href={`${appsRoot}/leads/view/${q.lead_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("Open Lead in new tab")}
                      className="text-decoration-none ms-1"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </span>
                ) : null
              }
            />
            <InfoRow
              icon={Hash}
              value={q?._id ? `#${q._id.slice(-6)}` : null}
            />
          </ul>

          <div className="d-grid gap-1">
            {canEdit && (
              <>
                <Button
                  color="primary"
                  outline
                  onClick={() => navigate(`${appsRoot}/quotations/edit/${id}`)}
                  id="qt-edit-from-view"
                >
                  <Edit size={14} className="me-50" /> {t("Edit")}
                </Button>
                <UncontrolledTooltip target="qt-edit-from-view" placement="top">
                  {t("Edit quotation")}
                </UncontrolledTooltip>
              </>
            )}
            {canConvertToPfi && (q?.status || "").toLowerCase() === "approved" && (
              <>
                <Button
                  color="info"
                  outline
                  onClick={handleConvertToPfi}
                  id="qt-convert-to-pfi"
                >
                  <FileText size={14} className="me-50" /> {t("Convert to PFI")}
                </Button>
                <UncontrolledTooltip target="qt-convert-to-pfi" placement="top">
                  {t("Create a PFI from this quotation")}
                </UncontrolledTooltip>
              </>
            )}
            {canGeneratePo && (q?.status || "").toLowerCase() === "approved" && (
              <>
                <Button
                  color="success"
                  onClick={() => setPoModalOpen(true)}
                  id="qt-generate-pos"
                >
                  <Truck size={14} className="me-50" /> {t("Generate POs")}
                </Button>
                <UncontrolledTooltip target="qt-generate-pos" placement="top">
                  {t("Split this Quotation into vendor Purchase Orders")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        </CardBody>
      </Card>
      <PoGeneratePreviewModal
        isOpen={poModalOpen}
        toggle={() => setPoModalOpen((s) => !s)}
        sourceType="quotation"
        sourceId={id}
        sourceVoucherNo={q?.voucher_no}
        onCreated={() => dispatch(getQuotation(id))}
      />
    </Fragment>
  );
};

export default QuotationInfoCard;
