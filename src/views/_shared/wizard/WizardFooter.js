import { Button, Spinner } from "reactstrap";
import { ChevronLeft, ChevronRight, Save } from "react-feather";
import { useTranslation } from "react-i18next";

const WizardFooter = ({
  isFirst,
  isLast,
  isEdit,
  onBack,
  onNext,
  onSubmit,
  onCancel,
  submitting,
}) => {
  const { t } = useTranslation();
  // Add mode: hide Save until the last step (force the user through the
  // wizard). Edit mode: Save is always available — data is already complete.
  const showSave = isEdit || isLast;
  return (
    <div className="wizard-footer">
      <div className="footer-left">
        <Button
          type="button"
          color="secondary"
          outline
          onClick={onCancel}
          disabled={submitting}
        >
          {t("Cancel")}
        </Button>
        {!isFirst && (
          <Button
            type="button"
            color="secondary"
            outline
            onClick={onBack}
            disabled={submitting}
          >
            <ChevronLeft size={15} className="me-25" />
            {t("Back")}
          </Button>
        )}
      </div>

      <div className="footer-right">
        {showSave && (
          <Button
            type="button"
            color="primary"
            outline={!isLast}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Save size={15} className="me-25" />
                {t("Save")}
              </>
            )}
          </Button>
        )}
        {!isLast && (
          <Button
            type="button"
            color="primary"
            onClick={onNext}
            disabled={submitting}
          >
            {t("Next")}
            <ChevronRight size={15} className="ms-25" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default WizardFooter;
