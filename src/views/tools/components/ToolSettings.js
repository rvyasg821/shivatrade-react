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
  Alert
} from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Icons
import { Plus, Trash2, Settings } from 'react-feather'

const ToolSettings = ({
  toolId,
  selectedCompany,
  onSettingsChange,
  initialSettings = []
}) => {
  const { t } = useTranslation()

  // ** Validation Schema
  const settingSchema = yup.object().shape({
    name: yup.string().required(t('Setting name is required')).min(2, t('Name must be at least 2 characters')),
    type: yup.string().required(t('Setting type is required')),
    ipAddressOrUrl: yup.string().when('type', {
      is: (val) => ['api', 'database', 'service'].includes(val),
      then: yup.string().required(t('IP Address/URL is required')),
      otherwise: yup.string()
    }),
    port: yup.number().when('type', {
      is: (val) => ['api', 'database', 'service'].includes(val),
      then: yup.number().required(t('Port is required')).min(1).max(65535),
      otherwise: yup.number()
    }),
    username: yup.string().when('type', {
      is: (val) => ['database', 'service', 'auth'].includes(val),
      then: yup.string().required(t('Username is required')),
      otherwise: yup.string()
    }),
    password: yup.string().when('type', {
      is: (val) => ['database', 'service', 'auth'].includes(val),
      then: yup.string().required(t('Password is required')),
      otherwise: yup.string()
    }),
    description: yup.string().max(500, t('Description cannot exceed 500 characters'))
  })

  const settingsSchema = yup.object().shape({
    settings: yup.array().of(settingSchema)
  })

  // ** Form Setup
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      settings: initialSettings.length > 0 ? initialSettings : [getDefaultSetting()]
    },
    resolver: yupResolver(settingsSchema)
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'settings'
  })

  const watchedSettings = watch('settings')

  // ** Default Setting Structure
  function getDefaultSetting() {
    return {
      name: '',
      type: 'api',
      ipAddressOrUrl: '',
      port: '',
      username: '',
      password: '',
      description: ''
    }
  }

  // ** Setting Types
  const settingTypes = [
    { value: 'api', label: t('API Endpoint') },
    { value: 'database', label: t('Database Connection') },
    { value: 'service', label: t('External Service') },
    { value: 'auth', label: t('Authentication') },
    { value: 'config', label: t('Configuration') },
    { value: 'other', label: t('Other') }
  ]

  // ** Effects
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(watchedSettings)
    }
  }, [watchedSettings, onSettingsChange])

  // ** Handlers
  const addSetting = () => {
    append(getDefaultSetting())
  }

  const removeSetting = (index) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const onSubmit = (data) => {
    console.log('Settings data:', data)
    if (onSettingsChange) {
      onSettingsChange(data.settings)
    }
  }

  return (
    <Card className="p-1">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <Settings size={20} className="me-2" />
          <div>
            <h5 className="mb-0">{t('Tool Settings')}</h5>
            {/* {selectedCompany && (
              <small className="text-muted">{t('Company-specific settings')}</small>
            )} */}
          </div>
        </div>
        <Button
          color="primary"
          size="sm"
          onClick={addSetting}
        >
          <Plus size={16} className="me-1" />
          {t('Add Setting')}
        </Button>
      </CardHeader>

      <CardBody className="p-2">
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-3 border">
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    {fields.length > 1 && (
                      <Button
                        color="danger"
                        size="sm"
                        outline
                        onClick={() => removeSetting(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  <Row className="p-2">
                    {/* Setting Name */}
                    <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('Name')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`settings.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder={t('Enter setting name')}
                            invalid={errors.settings?.[index]?.name && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.name && (
                        <FormFeedback>{errors.settings[index].name.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Setting Type */}
                    <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('Type')} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name={`settings.${index}.type`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="input"
                            // editable={false}
                            editableText={false}
                            invalid={errors.settings?.[index]?.type && true}
                          >
                            {settingTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Input>
                        )}
                      />
                      {errors.settings?.[index]?.type && (
                        <FormFeedback>{errors.settings[index].type.message}</FormFeedback>
                      )}
                    </Col>

                    {/* IP Address/URL */}
                    {/* <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('IP Address/URL')}
                        {['api', 'database', 'service'].includes(watchedSettings[index]?.type) && (
                          <span className="text-danger">*</span>
                        )}
                      </Label>
                      <Controller
                        name={`settings.${index}.ipAddressOrUrl`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder={t('Enter IP address or URL')}
                            invalid={errors.settings?.[index]?.ipAddressOrUrl && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.ipAddressOrUrl && (
                        <FormFeedback>{errors.settings[index].ipAddressOrUrl.message}</FormFeedback>
                      )}
                    </Col> */}

                    {/* Port */}
                    <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('Port')}
                        {['api', 'database', 'service'].includes(watchedSettings[index]?.type) && (
                          <span className="text-danger">*</span>
                        )}
                      </Label>
                      <Controller
                        name={`settings.${index}.port`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            placeholder={t('Enter port number')}
                            invalid={errors.settings?.[index]?.port && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.port && (
                        <FormFeedback>{errors.settings[index].port.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Username */}
                    <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('Username')}
                        {['database', 'service', 'auth'].includes(watchedSettings[index]?.type) && (
                          <span className="text-danger">*</span>
                        )}
                      </Label>
                      <Controller
                        name={`settings.${index}.username`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder={t('Enter username')}
                            invalid={errors.settings?.[index]?.username && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.username && (
                        <FormFeedback>{errors.settings[index].username.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Password */}
                    <Col md="4" className="mb-2">
                      <Label className="form-label">
                        {t('Password')}
                        {['database', 'service', 'auth'].includes(watchedSettings[index]?.type) && (
                          <span className="text-danger">*</span>
                        )}
                      </Label>
                      <Controller
                        name={`settings.${index}.password`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="password"
                            placeholder={t('Enter password')}
                            invalid={errors.settings?.[index]?.password && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.password && (
                        <FormFeedback>{errors.settings[index].password.message}</FormFeedback>
                      )}
                    </Col>

                    {/* Description */}
                    <Col md="12" className="mb-2">
                      <Label className="form-label">{t('Description')}</Label>
                      <Controller
                        name={`settings.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="textarea"
                            rows="2"
                            placeholder={t('Enter setting description')}
                            invalid={errors.settings?.[index]?.description && true}
                          />
                        )}
                      />
                      {errors.settings?.[index]?.description && (
                        <FormFeedback>{errors.settings[index].description.message}</FormFeedback>
                      )}
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            ))}
          </div>

          {fields.length === 0 && (
            <Alert color="info" className="text-center">
              <p className="mb-2">{t('No settings configured yet.')}</p>
              <Button color="primary" onClick={addSetting}>
                <Plus size={16} className="me-1" />
                {t('Add First Setting')}
              </Button>
            </Alert>
          )}
        </Form>
      </CardBody>
    </Card>
  )
}

export default ToolSettings