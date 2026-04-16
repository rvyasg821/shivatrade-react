// ** React Imports
import { useEffect } from 'react'

// ** Reactstrap Imports
import {
  Card,
  CardBody,
  CardHeader,
  Row,
  Col,
  Form,
  Input,
  Label,
  Button,
  FormFeedback,
  Alert,
  Badge
} from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Icons
import { Plus, Trash2, Clock, Play, Pause } from 'react-feather'

const ToolSchedules = ({ 
  toolId, 
  selectedCompany, 
  onSchedulesChange,
  initialSchedules = []
}) => {
  const { t } = useTranslation()

  // ** Validation Schema
  const scheduleSchema = yup.object().shape({
    name: yup.string().required(t('Schedule name is required')).min(2, t('Name must be at least 2 characters')),
    type: yup.string().required(t('Schedule type is required')),
    expression: yup.string().required(t('Schedule expression is required')),
    status: yup.number().required(t('Status is required')).oneOf([1, 2], t('Invalid status'))
  })

  const schedulesSchema = yup.object().shape({
    schedules: yup.array().of(scheduleSchema)
  })

  // ** Form Setup
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      schedules: initialSchedules.length > 0 ? initialSchedules : [getDefaultSchedule()]
    },
    resolver: yupResolver(schedulesSchema)
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'schedules'
  })

  const watchedSchedules = watch('schedules')

  // ** Default Schedule Structure
  function getDefaultSchedule() {
    return {
      name: '',
      type: 'cron',
      expression: '0 0 * * *', // Daily at midnight
      status: 1
    }
  }

  // ** Schedule Types
  const scheduleTypes = [
    { value: 'cron', label: t('Cron Expression') },
    { value: 'interval', label: t('Interval') },
    { value: 'once', label: t('One Time') },
    { value: 'daily', label: t('Daily') },
    { value: 'weekly', label: t('Weekly') },
    { value: 'monthly', label: t('Monthly') }
  ]

  // ** Common Cron Expressions
  const commonExpressions = [
    { value: '0 0 * * *', label: t('Daily at midnight') },
    { value: '0 0 * * 0', label: t('Weekly on Sunday') },
    { value: '0 0 1 * *', label: t('Monthly on 1st') },
    { value: '0 */6 * * *', label: t('Every 6 hours') },
    { value: '*/30 * * * *', label: t('Every 30 minutes') },
    { value: '*/5 * * * *', label: t('Every 5 minutes') }
  ]

  // ** Effects
  useEffect(() => {
    if (onSchedulesChange) {
      onSchedulesChange(watchedSchedules)
    }
  }, [watchedSchedules, onSchedulesChange])

  // ** Handlers
  const addSchedule = () => {
    append(getDefaultSchedule())
  }

  const removeSchedule = (index) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const onSubmit = (data) => {
    if (onSchedulesChange) {
      onSchedulesChange(data.schedules)
    }
  }

  const setCommonExpression = (index, expression) => {
    // This would need to be implemented with setValue from react-hook-form
    console.log('Setting expression for schedule', index, ':', expression)
  }

  const getStatusColor = (status) => {
    return status === 1 ? 'success' : 'secondary'
  }

  const getStatusText = (status) => {
    return status === 1 ? t('Active') : t('Inactive')
  }

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <Clock size={20} className="m-2" />
          <div>
            <h5 className="mb-0">{t('Tool Schedules')}</h5>
            {/* {selectedCompany && (
              <small className="text-muted">{t('Company-specific schedules')}</small>
            )} */}
          </div>
        </div>
        <Button
          color="primary"
          size="sm"
          onClick={addSchedule}
        >
          <Plus size={16} className="me-1" />
          {t('Add Schedule')}
        </Button>
      </CardHeader>
      
      <CardBody className="p-2">
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-3 border">
                <CardBody className="p-2">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      {/* <h6 className="mb-0 me-2">{t('Schedule')} #{index + 1}</h6> */}
                      {/* <Badge color={getStatusColor(watchedSchedules[index]?.status)}>
                        {getStatusText(watchedSchedules[index]?.status)}
                      </Badge> */}
                    </div>
                    {fields.length > 1 && (
                      <Button
                        color="danger"
                        size="sm"
                        outline
                        onClick={() => removeSchedule(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  <Row>
                    {/* Schedule Name */}
                    <Col md="6" className="mb-2">
                      <Label className="form-label">
                        {t('Name')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`schedules.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder={t('Enter schedule name')}
                            invalid={errors.schedules?.[index]?.name && true}
                          />
                        )}
                      />
                      {errors.schedules?.[index]?.name && (
                        <FormFeedback>{errors.schedules[index].name.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Schedule Type */}
                    <Col md="6" className="mb-2">
                      <Label className="form-label">
                        {t('Type')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`schedules.${index}.type`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="select"
                            className="text-capitalize width-250"
                            editable={false}
                            invalid={errors.schedules?.[index]?.type && true}
                          >
                            {scheduleTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Input>
                        )}
                      />
                      {errors.schedules?.[index]?.type && (
                        <FormFeedback>{errors.schedules[index].type.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Schedule Expression */}
                    <Col md="6" className="mb-2">
                      <Label className="form-label">
                        {t('Expression')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`schedules.${index}.expression`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder={t('Enter cron expression or schedule pattern')}
                            invalid={errors.schedules?.[index]?.expression && true}
                          />
                        )}
                      />
                      {errors.schedules?.[index]?.expression && (
                        <FormFeedback>{errors.schedules[index].expression.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Status */}
                    <Col md="6" className="mb-2">
                      <Label className="form-label">
                        {t('Status')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`schedules.${index}.status`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="select"
                            className="text-capitalize width-250"
                            invalid={errors.schedules?.[index]?.status && true}
                          >
                            <option value={1}>
                              {t('Active')}
                            </option>
                            <option value={2}>
                              {t('Inactive')}
                            </option>
                          </Input>
                        )}
                      />
                      {errors.schedules?.[index]?.status && (
                        <FormFeedback>{errors.schedules[index].status.message}</FormFeedback>
                      )}
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            ))}
          </div>

          {fields.length === 0 && (
            <Alert color="info" className="text-center">
              <p className="mb-2">{t('No schedules configured yet.')}</p>
              <Button color="primary" onClick={addSchedule}>
                <Plus size={16} className="me-1" />
                {t('Add First Schedule')}
              </Button>
            </Alert>
          )}
        </Form>
      </CardBody>
    </Card>
  )
}

export default ToolSchedules