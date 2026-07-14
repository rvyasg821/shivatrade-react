// ** React Imports
import { Fragment, useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getCurrency,
  getCurrencyDropdown,
  createCurrency,
  updateCurrency,
  cleanCurrencyMessage,
  getExchangeRates,
  addExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
} from "../store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap
import {
  Row,
  Col,
  Form,
  Card,
  CardBody,
  Label,
  Input,
  Button,
  FormFeedback,
  Table,
  UncontrolledTooltip,
  Modal,
  ModalHeader,
  ModalBody,
} from "reactstrap";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Form
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom
import Notification from "@components/toast/notification";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft, Plus, Edit, Trash2, Check, X, Clock } from "react-feather";

// ** Constants
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { initCurrencyItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS, EXCHANGE_TO_CURRENCY_OPTIONS } from "@constant/options";
import DateInput from "@components/date-input";
// Effective dates were rendering as the raw ISO slice ("2026-06-18").
import { formatDate } from "@src/utility/dateFormat";

// Exchange rates are STORED as "{to} units per 1 {from}" (e.g. USD per INR =
// 0.01) — the system-wide convention. The UI shows/enters the intuitive
// inverse "1 {to} = X {from}" (1 USD = 100 INR). Convert at the edge, rounding
// the stored value to the 6 dp the backend allows.
const round6 = (n) => Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
const toStoredRate = (intuitive) => {
  const x = Number(intuitive);
  return x > 0 ? String(round6(1 / x)) : "";
};
const toIntuitiveRate = (stored) => {
  const x = Number(stored);
  return x > 0 ? String(round6(1 / x)) : "";
};

const CurrencyForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.currency);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;
  const isEditMode = !!id;

  // Mirror the listing's permission gating for the rate-history actions.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.currencies;
  const canAddRate = isAdmin || perms?.can_add;
  const canEditRate = isAdmin || perms?.can_update;
  const canDeleteRate = isAdmin || perms?.can_delete;

  const schema = useMemo(
    () =>
      yup.object().shape({
        code: yup
          .string()
          .trim()
          .matches(/^[A-Za-z]{3}$/, t("Code must be exactly 3 letters"))
          .required(t("Currency code is required")),
        name: yup
          .string()
          .trim()
          .required(t("Name is required"))
          .max(100, t("Name must be at most 100 characters")),
        symbol: yup.string().trim().nullable().max(10, t("Symbol must be at most 10 characters")),
        status: yup
          .string()
          .oneOf(["active", "inactive"])
          .required(t("Status is required")),
        is_default: yup.boolean().nullable(),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCurrencyItem,
  });

  // ── Exchange rate sub-form state ──
  const [rateFormState, setRateFormState] = useState({
    to_currency_code: "",
    rate: "",
    effective_date: new Date().toISOString().slice(0, 10),
  });
  const [rateFormError, setRateFormError] = useState("");

  useLayoutEffect(() => {
    dispatch(getCurrencyDropdown());
    if (isEditMode) {
      dispatch(getCurrency(id));
      dispatch(getExchangeRates(id));
    } else {
      reset(initCurrencyItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.currencyItem && store.currencyItem._id) {
      const c = store.currencyItem;
      reset({
        _id: c._id,
        code: c.code || "",
        name: c.name || "",
        symbol: c.symbol || "",
        status: c.status || (c.is_active ? "active" : "inactive"),
        is_active: c.is_active,
        is_default: !!c.is_default,
      });
    }
  }, [store?.currencyItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "CUR_CRTD" || store?.actionFlag === "CUR_UPDT") {
      dispatch(cleanCurrencyMessage(null));
      navigate(`${appsRoot}/currencies`);
    }
    if (store?.actionFlag === "CUR_RATE_CRTD") {
      // Refresh rate history; reset sub-form
      dispatch(getExchangeRates(id));
      setRateFormState({
        to_currency_code: "",
        rate: "",
        effective_date: new Date().toISOString().slice(0, 10),
      });
      dispatch(cleanCurrencyMessage(null));
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      symbol: data.symbol?.trim() || undefined,
      status: data.status,
      is_active: data.status === "active",
      is_default: !!data.is_default,
    };

    if (isEditMode) {
      dispatch(updateCurrency({ id, data: payload }));
    } else {
      dispatch(createCurrency(payload));
    }
  };

  const onAddRate = () => {
    setRateFormError("");
    if (!rateFormState.to_currency_code) {
      setRateFormError(t("Please select a To currency"));
      return;
    }
    const entered = Number(rateFormState.rate);
    if (!rateFormState.rate || isNaN(entered) || entered <= 0) {
      setRateFormError(t("Please enter a valid rate"));
      return;
    }
    if (!rateFormState.effective_date) {
      setRateFormError(t("Please select an effective date"));
      return;
    }
    dispatch(
      addExchangeRate({
        currencyId: id,
        data: {
          to_currency_code: rateFormState.to_currency_code,
          // User enters the intuitive "1 {to} = X {from}" (e.g. 1 USD = 100
          // INR); the system stores the inverse "{to} per 1 {from}" (0.01).
          rate: toStoredRate(entered),
          effective_date: rateFormState.effective_date,
        },
      })
    );
  };

  // Filter the constant list:
  //   - exclude the currency we're editing (FROM side - no INR→INR rate)
  //   - exclude any code that already exists as a real currency row (a managed
  //     currency shouldn't appear as a "rate-target only" option)
  const currentCode = store?.currencyItem?.code;
  const existingCodes = useMemo(
    () =>
      new Set(
        (store?.currencyDropdown || [])
          .map((c) => (c.code || "").toUpperCase())
          .filter(Boolean)
      ),
    [store?.currencyDropdown]
  );
  const otherCurrencyOptions = useMemo(() => {
    return EXCHANGE_TO_CURRENCY_OPTIONS.filter(
      (o) => o.value !== currentCode && !existingCodes.has(o.value)
    );
  }, [currentCode, existingCodes]);

  const selectedTo = otherCurrencyOptions.find(
    (o) => o.value === rateFormState.to_currency_code
  );

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  const rates = store?.exchangeRates || [];

  // Current rate = the most recent effective entry per target currency. The
  // table shows just these; full per-currency history opens in a modal.
  const currentRates = useMemo(() => {
    const byCode = new Map();
    [...rates]
      .sort((a, b) =>
        String(b.effective_date || "").localeCompare(
          String(a.effective_date || "")
        )
      )
      .forEach((r) => {
        const code = r.to_currency_code;
        if (code && !byCode.has(code)) byCode.set(code, r);
      });
    return Array.from(byCode.values());
  }, [rates]);

  // Target currency code whose rate history modal is open (null = closed).
  const [historyCode, setHistoryCode] = useState(null);
  const historyRows = useMemo(
    () =>
      rates
        .filter((r) => r.to_currency_code === historyCode)
        .sort((a, b) =>
          String(b.effective_date || "").localeCompare(
            String(a.effective_date || "")
          )
        ),
    [rates, historyCode]
  );

  // Inline edit state for rate history rows
  const [editingRateId, setEditingRateId] = useState(null);
  const [editingRate, setEditingRate] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const mySwal = withReactContent(Swal);

  const startEditRate = (r) => {
    setEditingRateId(r._id);
    setEditingRate(toIntuitiveRate(r.rate));
    setEditingDate((r.effective_date || "").slice(0, 10));
  };
  const cancelEditRate = () => {
    setEditingRateId(null);
    setEditingRate("");
    setEditingDate("");
  };
  const saveEditRate = async () => {
    if (!editingRateId) return;
    await dispatch(
      updateExchangeRate({
        currencyId: id,
        rateId: editingRateId,
        data: {
          rate: toStoredRate(editingRate),
          effective_date: editingDate || undefined,
        },
      })
    );
    cancelEditRate();
    dispatch(getExchangeRates(id));
  };
  const deleteRateRow = (r) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("Delete this exchange-rate entry?"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        await dispatch(
          deleteExchangeRate({ currencyId: id, rateId: r._id })
        );
        dispatch(getExchangeRates(id));
      });
  };

  return (
    <Fragment>
      <div className="main-content currencies">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Currency") : t("Add Currency")}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="code">
                    {t("Currency Code")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="code"
                        maxLength={3}
                        placeholder="USD"
                        invalid={!!errors.code}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    )}
                  />
                  {errors.code && (
                    <FormFeedback className="d-block">
                      {errors.code.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="name">
                    {t("Currency Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="name"
                        placeholder={t("e.g. United States Dollar")}
                        invalid={!!errors.name}
                        {...field}
                      />
                    )}
                  />
                  {errors.name && (
                    <FormFeedback className="d-block">
                      {errors.name.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label" for="symbol">
                    {t("Symbol")}
                  </Label>
                  <Controller
                    name="symbol"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="symbol"
                        placeholder="$"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col>

                <Col md="12" className="mb-2">
                  <Controller
                    name="is_default"
                    control={control}
                    render={({ field }) => (
                      <div className="form-check d-flex align-items-center flex-wrap gap-1">
                        <Input
                          type="checkbox"
                          id="currency-is-default"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <Label
                          className="form-check-label mb-0"
                          for="currency-is-default"
                        >
                          {t("Set as default currency (company's home currency)")}
                        </Label>
                        <small className="text-muted">
                          {t(
                            "— used as the base for all exchange-rate lookups; exactly one per company."
                          )}
                        </small>
                      </div>
                    )}
                  />
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label d-block">
                    {t("Status")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="d-flex align-items-center gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`currency-status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label
                              className="form-check-label"
                              for={`currency-status-${opt.value}`}
                            >
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </Col>

                {/* CTA on the same row as Status, right-aligned. */}
                <Col
                  md="6"
                  className="mb-2 d-flex align-items-end justify-content-end gap-1"
                >
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={() => navigate(-1)}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button type="submit" color="primary" disabled={isSubmitting}>
                    {isEditMode ? t("Update") : t("Create")}
                  </Button>
                </Col>
              </Row>
            </Form>
          </CardBody>
        </Card>

        {/* ── Exchange Rates section (edit mode only) ── */}
        {isEditMode && (
          <Card className="mt-3">
            <CardBody>
              <div className="d-flex align-items-center flex-wrap gap-1 mb-2">
                <h4 className="mb-0">{t("Exchange Rates")}</h4>
                <small className="text-muted">
                  {t(
                    "— newest effective rate is used; prior entries are kept as history."
                  )}
                </small>
              </div>

              {canAddRate && (
                <Row className="align-items-end mb-2">
                  <Col md="4">
                    <Label className="form-label">{t("Currency")}</Label>
                    <Select
                      classNamePrefix="select"
                      options={otherCurrencyOptions}
                      value={selectedTo || null}
                      placeholder={t("Select currency")}
                      onChange={(opt) =>
                        setRateFormState((s) => ({
                          ...s,
                          to_currency_code: opt ? opt.value : "",
                        }))
                      }
                    />
                  </Col>
                  <Col md="3">
                    <Label className="form-label">
                      {t("Rate")}
                      {selectedTo ? (
                        <span className="text-muted">
                          {" "}
                          (1 {selectedTo.value} = ? {currentCode || "INR"})
                        </span>
                      ) : null}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="100"
                      value={rateFormState.rate}
                      onChange={(e) =>
                        setRateFormState((s) => ({ ...s, rate: e.target.value }))
                      }
                    />
                  </Col>
                  <Col md="3">
                    <Label className="form-label">{t("Effective Date")}</Label>
                    <DateInput
                      id="effective_date"
                      value={rateFormState.effective_date || ""}
                      onChange={(dates, str, iso) =>
                        setRateFormState((s) => ({
                          ...s,
                          effective_date: iso,
                        }))
                      }
                    />
                  </Col>
                  <Col md="2">
                    <Button color="primary" type="button" onClick={onAddRate}>
                      <Plus size={14} /> {t("Add Rate")}
                    </Button>
                  </Col>
                </Row>
              )}

              {rateFormError && (
                <div className="text-danger mb-2">{rateFormError}</div>
              )}

              {currentRates.length === 0 ? (
                <div className="text-muted">{t("No rates yet")}</div>
              ) : (
                <Table className="text-nowrap mb-0" responsive bordered>
                  <thead>
                    <tr>
                      <th>{t("From")}</th>
                      <th>{t("To")}</th>
                      <th>{t("Rate")} (1 {t("From")} = ? {t("To")})</th>
                      <th>{t("Effective Date")}</th>
                      {true && (
                        <th className="text-center" style={{ width: 130 }}>
                          {t("Actions")}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRates.map((r) => {
                      const isEditing = editingRateId === r._id;
                      return (
                        <tr key={r._id}>
                          {/* Displayed in the intuitive direction "1 {to} =
                              X {from}", so From = the foreign (to_currency),
                              To = the default (from_currency). */}
                          <td className="text-uppercase">
                            {r.to_currency_code || "-"}
                          </td>
                          <td className="text-uppercase">
                            {r.from_currency_code || "-"}
                          </td>
                          <td>
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.000001"
                                min="0"
                                bsSize="sm"
                                value={editingRate}
                                onChange={(e) =>
                                  setEditingRate(e.target.value)
                                }
                              />
                            ) : r.rate !== null && r.rate !== undefined ? (
                              toIntuitiveRate(r.rate)
                            ) : (
                              ""
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <DateInput
                                id={`rate-date-${r._id}`}
                                value={editingDate || ""}
                                onChange={(dates, str, iso) =>
                                  setEditingDate(iso)
                                }
                              />
                            ) : (
                              formatDate(r.effective_date)
                            )}
                          </td>
                          {true && (
                          <td className="text-center">
                            {isEditing ? (
                              <Fragment>
                                <Check
                                  size={18}
                                  className="cursor-pointer text-success me-1"
                                  onClick={saveEditRate}
                                  id={`rate-save-${r._id}`}
                                />
                                <UncontrolledTooltip
                                  placement="top"
                                  target={`rate-save-${r._id}`}
                                >
                                  {t("Save")}
                                </UncontrolledTooltip>
                                <X
                                  size={18}
                                  className="cursor-pointer text-muted"
                                  onClick={cancelEditRate}
                                  id={`rate-cancel-${r._id}`}
                                />
                                <UncontrolledTooltip
                                  placement="top"
                                  target={`rate-cancel-${r._id}`}
                                >
                                  {t("Cancel")}
                                </UncontrolledTooltip>
                              </Fragment>
                            ) : (
                              <Fragment>
                                <Clock
                                  size={18}
                                  className="cursor-pointer text-muted me-1"
                                  onClick={() =>
                                    setHistoryCode(r.to_currency_code)
                                  }
                                  id={`rate-history-${r._id}`}
                                />
                                <UncontrolledTooltip
                                  placement="top"
                                  target={`rate-history-${r._id}`}
                                >
                                  {t("Rate History")}
                                </UncontrolledTooltip>
                                {canEditRate && (
                                  <Fragment>
                                    <Edit
                                      size={18}
                                      className="cursor-pointer me-1"
                                      onClick={() => startEditRate(r)}
                                      id={`rate-edit-${r._id}`}
                                    />
                                    <UncontrolledTooltip
                                      placement="top"
                                      target={`rate-edit-${r._id}`}
                                    >
                                      {t("Edit")}
                                    </UncontrolledTooltip>
                                  </Fragment>
                                )}
                                {canDeleteRate && (
                                  <Fragment>
                                    <Trash2
                                      size={18}
                                      className="cursor-pointer text-danger"
                                      onClick={() => deleteRateRow(r)}
                                      id={`rate-delete-${r._id}`}
                                    />
                                    <UncontrolledTooltip
                                      placement="top"
                                      target={`rate-delete-${r._id}`}
                                    >
                                      {t("Delete")}
                                    </UncontrolledTooltip>
                                  </Fragment>
                                )}
                              </Fragment>
                            )}
                          </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}

        {/* Rate history modal — all entries for one target currency. */}
        <Modal
          isOpen={!!historyCode}
          toggle={() => setHistoryCode(null)}
          size="md"
          centered
        >
          <ModalHeader toggle={() => setHistoryCode(null)}>
            {t("Rate History")}
            {historyCode ? (
              <span className="text-muted">
                {" "}
                — 1 {historyCode} = ? {currentCode || "INR"}
              </span>
            ) : null}
          </ModalHeader>
          <ModalBody>
            {historyRows.length === 0 ? (
              <div className="text-center text-muted py-3">
                {t("No rates yet")}
              </div>
            ) : (
              <Table responsive bordered size="sm" className="mb-0">
                <tbody>
                  {historyRows.map((r, i) => (
                    <tr key={r._id}>
                      <td className="fw-semibold text-nowrap">
                        {toIntuitiveRate(r.rate)} {currentCode || "INR"}
                      </td>
                      <td className="text-nowrap">
                        {formatDate(r.effective_date)}
                      </td>
                      <td className="text-end" style={{ width: 90 }}>
                        <span
                          className={`badge rounded-pill ${
                            i === 0 ? "bg-light-success" : "bg-light-secondary"
                          }`}
                        >
                          {i === 0 ? t("Current") : t("Past")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </ModalBody>
        </Modal>
      </div>
    </Fragment>
  );
};

export default CurrencyForm;
