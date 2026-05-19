// Tracking tab — transporter, vehicle, LR, e-way bill, dates.
// Editable inline while POV is draft or dispatched (per edit lock §11).

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Row, Col, Label, Input, Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";

import { updatePoVendor } from "@src/views/po-vendors/store";
import DateInput from "@components/date-input";
import { isAdminUser } from "@constant/defaultValues";

const TrackingTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};
  const status = (p?.status || "").toLowerCase();

  // Permission gate — po-vendors.can_update lets the user save changes.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;

  // Editable in DRAFT or DISPATCHED, but only if user can update.
  const editable = canUpdate && (status === "draft" || status === "dispatched");

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      transporter_name: "",
      vehicle_no: "",
      lr_no: "",
      lr_date: "",
      eway_bill_no: "",
      eway_bill_date: "",
      expected_arrival_date: "",
      notes: "",
      internal_notes: "",
    },
  });

  useEffect(() => {
    if (p?._id) {
      reset({
        transporter_name: p.transporter_name || "",
        vehicle_no: p.vehicle_no || "",
        lr_no: p.lr_no || "",
        lr_date: (p.lr_date || "").slice(0, 10),
        eway_bill_no: p.eway_bill_no || "",
        eway_bill_date: (p.eway_bill_date || "").slice(0, 10),
        expected_arrival_date: (p.expected_arrival_date || "").slice(0, 10),
        notes: p.notes || "",
        internal_notes: p.internal_notes || "",
      });
    }
  }, [p?._id, reset]);

  const onSubmit = (values) => {
    const data = {
      transporter_name: values.transporter_name || undefined,
      vehicle_no: values.vehicle_no || undefined,
      lr_no: values.lr_no || undefined,
      lr_date: values.lr_date ? values.lr_date.slice(0, 10) : undefined,
      eway_bill_no: values.eway_bill_no || undefined,
      eway_bill_date: values.eway_bill_date
        ? values.eway_bill_date.slice(0, 10)
        : undefined,
      expected_arrival_date: values.expected_arrival_date
        ? values.expected_arrival_date.slice(0, 10)
        : undefined,
      notes: values.notes || undefined,
      internal_notes: values.internal_notes || undefined,
    };
    dispatch(updatePoVendor({ id, data }));
  };

  return (
    <Fragment>
      <Card>
        <CardBody>
          <h4 className="mb-2">{t("Tracking")}</h4>
          {!editable && (
            <div className="alert alert-secondary small mb-2">
              {t(
                "Tracking fields are read-only because this POV is closed/cancelled."
              )}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Transporter")}</Label>
                <Controller
                  name="transporter_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                      placeholder={t("Transporter name")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Vehicle No")}</Label>
                <Controller
                  name="vehicle_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                      placeholder={t("e.g. MH04AB1234")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("LR / Bilty No")}</Label>
                <Controller
                  name="lr_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("LR Date")}</Label>
                <Controller
                  name="lr_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-lr-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("E-way Bill No")}</Label>
                <Controller
                  name="eway_bill_no"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("E-way Bill Date")}</Label>
                <Controller
                  name="eway_bill_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-eway-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Expected Arrival")}</Label>
                <Controller
                  name="expected_arrival_date"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      id="pov-exp-arr-date"
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso || "")}
                      disabled={!editable}
                      placeholder={t("YYYY-MM-DD")}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Notes (vendor-visible)")}</Label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      rows="2"
                      {...field}
                      value={field.value || ""}
                      disabled={!editable}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Internal Notes")}</Label>
                <Controller
                  name="internal_notes"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="textarea"
                      rows="2"
                      {...field}
                      value={field.value || ""}
                      placeholder={t("Hidden from any vendor-facing view")}
                    />
                  )}
                />
              </Col>
            </Row>
            <div className="d-flex justify-content-end">
              <Button color="primary" type="submit">
                {t("Save Tracking")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default TrackingTab;
