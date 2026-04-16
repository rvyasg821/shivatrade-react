import { Fragment, useState } from "react";
import { Row, Col, Button, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle } from "react-feather";
import FaceCaptureModal from "@src/views/attendance/components/FaceCaptureModal";

const FaceRegistrationTab = ({ employeeData, employeeId, onSave, loading, getBackendImageUrl }) => {
  const { t } = useTranslation();
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);

  const hasFaceDescriptor =
    employeeData?.face_descriptor &&
    Array.isArray(employeeData.face_descriptor) &&
    employeeData.face_descriptor.length > 0;

  const existingFaceImage = employeeData?.face_reference_photo
    ? getBackendImageUrl(employeeData.face_reference_photo)
    : null;

  const handleCapture = (base64) => {
    setCapturedFaceImage(base64);
    setFaceModalOpen(false);
  };

  const handleSaveFace = () => {
    if (capturedFaceImage) {
      onSave({ face_image: capturedFaceImage });
    }
  };

  return (
    <Fragment>
      <Row>
        <Col md="6">
          <div className="d-flex align-items-center gap-1 mb-2">
            <Button
              type="button"
              color={(capturedFaceImage || hasFaceDescriptor) ? "success" : "primary"}
              outline
              onClick={() => setFaceModalOpen(true)}
            >
              <Camera size={14} className="me-50" />
              {(capturedFaceImage || hasFaceDescriptor) ? t("Re-capture Face") : t("Capture Face")}
            </Button>
            {!capturedFaceImage && hasFaceDescriptor && (
              <span className="text-success d-flex align-items-center">
                <CheckCircle size={14} className="me-50" />
                {t("Face already registered")}
              </span>
            )}
            {capturedFaceImage && (
              <span className="text-success d-flex align-items-center">
                <CheckCircle size={14} className="me-50" />
                {t("Face captured - click Save to register")}
              </span>
            )}
          </div>

          {capturedFaceImage && (
            <div className="mb-2">
              <img
                src={capturedFaceImage}
                alt="Captured face"
                style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 8, border: "2px solid #28c76f" }}
              />
            </div>
          )}

          {!capturedFaceImage && existingFaceImage && (
            <div className="mb-2">
              <img
                src={existingFaceImage}
                alt="Registered face"
                style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 8, border: "2px solid #28c76f" }}
              />
            </div>
          )}

          <small className="text-muted d-block mb-2">
            {t("Capture a clear face photo for attendance face verification.")}
          </small>

          {capturedFaceImage && (
            <Button color="primary" onClick={handleSaveFace} disabled={loading}>
              {loading ? <Spinner size="sm" /> : t("Save Face Registration")}
            </Button>
          )}
        </Col>
      </Row>

      <FaceCaptureModal
        isOpen={faceModalOpen}
        toggle={() => setFaceModalOpen(false)}
        actionLabel={t("Register")}
        onCapture={handleCapture}
      />
    </Fragment>
  );
};

export default FaceRegistrationTab;
