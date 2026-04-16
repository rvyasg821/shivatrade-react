// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from 'react';

// ** Store & Actions
import { useDispatch, useSelector } from 'react-redux';
import { cleanToolsMessage } from '../store';
import { startLoading, stopLoading } from '../../loadingstore';

// ** Reactstrap Imports
import {
  Row,
  Form,
  Card,
  Label,
  Input,
  Button,
  Spinner,
  CardBody,
  FormFeedback,
} from 'reactstrap';

import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

// ** Custom Components
import Notification from '@components/toast/notification';

// ** Third Party Components
import { useTranslation } from 'react-i18next';

// ** Constant
import { appsRoot, ENUM_TOOL_SCHEDULE_STATUS } from '@constant/defaultValues';

const ToolScheduleForm = () => {
  // ** Hooks
  const { t } = useTranslation();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.tools);

  // ** States
  const [resetValue, setResetValue] = useState(false);

  // ** Constants
  const isEditMode = false; // For now, assuming this is for creating schedules

  /* Yup validation schema */
  const ToolScheduleSchema = yup.object().shape({
    scheduleName: yup
      .string()
      .required(`${t('Schedule name is required')}.`)
      .min(3, `${t('Name must be at least 3 characters')}.`)
      .max(100, `${t('Name must be at most 100 characters')}.`)
      .trim(),
    frequency: yup
      .string()
      .required(`${t('Frequency is required')}.`)
      .oneOf(['daily', 'weekly', 'monthly'], `${t('Invalid frequency')}.`),
    startTime: yup.string().required(`${t('Start time is required')}.`),
    status: yup
      .number()
      .required(`${t('Status is required')}.`)
      .oneOf(
        Object.keys(ENUM_TOOL_SCHEDULE_STATUS).map(Number),
        `${t('Invalid status')}.`,
      ),
  });

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm({
    mode: 'all',
    defaultValues: {
      scheduleName: '',
      frequency: 'daily',
      startTime: '',
      status: 1,
    },
    resolver: yupResolver(ToolScheduleSchema),
    shouldFocusError: false,
  });

  useLayoutEffect(() => {
    console.log('=== TOOL SCHEDULE FORM INITIALIZATION ===');
  }, []);

  useEffect(() => {
    console.log('=== REDUX STORE UPDATE ===');
    console.log('Store state:', {
      actionFlag: store?.actionFlag,
      success: store?.success,
      error: store?.error,
      loading: store?.loading,
    });

    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanToolsMessage(null));
    }

    /* Success toast notification */
    if (store?.success) {
      // Notification('Success', store.success, 'success');
    }

    /* Error toast notification */
    if (store?.error) {
      Notification('Error', store.error, 'warning');
    }
  }, [store.actionFlag, store.success, store.error]);

  const handleCancel = () => {
    // Reset the form to its initial values
    reset({
      scheduleName: '',
      frequency: 'daily',
      startTime: '',
      status: 1,
    });
  };

  const onSubmit = (values) => {
    if (values) {
      const scheduleData = {
        scheduleName: values?.scheduleName || '',
        frequency: values?.frequency || 'daily',
        startTime: values?.startTime || '',
        status: parseInt(values?.status) || 1,
      };

      console.log('Processed schedule data:', scheduleData);
      Notification('Success', 'Schedule saved successfully', 'success');
    } else {
      console.error('No form values received!');
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row>
            <Form
              className=""
              autoComplete="off"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Row>
                {/* Schedule Name */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                  <Label className="form-label" for="scheduleName">
                    {t('Schedule Name')} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="scheduleName"
                    name="scheduleName"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        className=""
                        autoComplete="off"
                        invalid={errors.scheduleName && true}
                        placeholder={t('Enter schedule name')}
                      />
                    )}
                  />
                  <FormFeedback>{errors.scheduleName?.message}</FormFeedback>
                </div>

                {/* Frequency */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                  <Label className="form-label" for="frequency">
                    {t('Frequency')} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="frequency"
                    name="frequency"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="select"
                        className=""
                        invalid={errors.frequency && true}
                      >
                        <option value="daily">{t('Daily')}</option>
                        <option value="weekly">{t('Weekly')}</option>
                        <option value="monthly">{t('Monthly')}</option>
                      </Input>
                    )}
                  />
                  <FormFeedback>{errors.frequency?.message}</FormFeedback>
                </div>
              </Row>

              <Row>
                {/* Start Time */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                  <Label className="form-label" for="startTime">
                    {t('Start Time')} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="startTime"
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="time"
                        className=""
                        invalid={errors.startTime && true}
                      />
                    )}
                  />
                  <FormFeedback>{errors.startTime?.message}</FormFeedback>
                </div>

                {/* Status */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                  <Label className="form-label" for="status">
                    {t('Status')} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="status"
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Row className="px-1 status">
                        <div
                          className="form-check"
                          style={{ width: 'max-content' }}
                        >
                          <Input
                            {...field}
                            id="status_active"
                            type="radio"
                            value={1}
                            checked={field?.value === 1}
                            onChange={() => field.onChange(1)}
                          />
                          <Label
                            className="form-check-label"
                            for="status_active"
                          >
                            {t('Active')}
                          </Label>
                        </div>

                        <div
                          className="form-check"
                          style={{ width: 'max-content' }}
                        >
                          <Input
                            {...field}
                            id="status_inactive"
                            type="radio"
                            value={2}
                            checked={field?.value === 2}
                            onChange={() => field.onChange(2)}
                          />
                          <Label
                            className="form-check-label"
                            for="status_inactive"
                          >
                            {t('Inactive')}
                          </Label>
                        </div>
                      </Row>
                    )}
                  />
                  <FormFeedback className="d-block">
                    {errors.status?.message}
                  </FormFeedback>
                </div>
              </Row>

              <div className="main-form-btn">
                <div className="form-btn mt-2 ps-2">
                  <Button
                    type="submit"
                    color="primary"
                    disabled={!store.loading}
                  >
                    {store?.loading ? (
                      t('Save')
                    ) : (
                      <Spinner className="spinner-border-login" size="sm" />
                    )}
                  </Button>
                </div>

                <div className="form-btn mt-2">
                  <Button
                    type="button"
                    color="secondary"
                    disabled={!store.loading}
                    onClick={handleCancel}
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            </Form>
          </Row>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default ToolScheduleForm;
