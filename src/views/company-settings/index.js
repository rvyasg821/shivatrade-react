import React, { Fragment, useEffect, useState } from 'react'
import useFormLoading from '@src/hooks/useFormLoading'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Row, Col, Spinner, Input, Label, FormGroup,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Alert, ButtonGroup, Badge, Table,
} from 'reactstrap'
import { Mail, MessageSquare, Phone, Image, Info, RotateCcw, Eye, EyeOff, Settings, Edit3, Upload } from 'react-feather'
import { hostRestApiUrl } from '@constant/defaultValues'
import Select from 'react-select'
import {
  getCompanySettings, updateCompanySettings, resetCompanyLocationSettings, clearCompanySettingsActionFlag,
} from './store'
import {
  getNotificationEvents, getNotificationPreferences, updateNotificationPreferences,
  getNotificationTemplates, updateNotificationTemplate, deleteNotificationTemplate,
  clearNotificationSettingsFlag,
} from './notificationStore'
import Notification from '@components/toast/notification'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'
import SetupReturnBanner from '@src/components/SetupReturnBanner'

const CompanySettingsPage = () => {
  const dispatch = useDispatch()
  const store = useSelector((s) => s.companySettings)
  const authStore = useSelector((s) => s.auth)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}

  const roleName = authStore?.authUserItem?.role?.name || ''
  const isCompanyAdmin = roleName === 'Company Admin'
  const isLocationAdmin = roleName === 'Location Admin'
  const companyLocations = locationCtx?.companyLocations || []

  const notifStore = useSelector((s) => s.notificationSettings)

  const [submitting, setSubmitting] = useState(false)
  useFormLoading(submitting)
  const [activeTab, setActiveTab] = useState('general')
  const [settingsScope, setSettingsScope] = useState('company')
  const [settingsLocationId, setSettingsLocationId] = useState('')

  // Notification preferences local state
  const [localPrefs, setLocalPrefs] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editTemplate, setEditTemplate] = useState({ channel: 'email', subject: '', body: '' })

  // Visibility toggles for sensitive fields
  const [showFields, setShowFields] = useState({})
  const toggleShow = (field) => setShowFields((prev) => ({ ...prev, [field]: !prev[field] }))

  // SMTP test state
  const [smtpTesting, setSmtpTesting] = useState(false)
  const handleTestSmtp = async () => {
    if (!settingsData.smtp_host || !settingsData.smtp_username) {
      Notification('Warning', 'Please fill in SMTP host and username first.', 'warning')
      return
    }
    setSmtpTesting(true)
    try {
      const res = await instance.post(API_ENDPOINTS.companySettings.testSmtp, {
        smtp_host: settingsData.smtp_host,
        smtp_port: settingsData.smtp_port,
        smtp_username: settingsData.smtp_username,
        smtp_password: settingsData.smtp_password,
        smtp_from_email: settingsData.smtp_from_email,
        smtp_from_name: settingsData.smtp_from_name,
        smtp_secure: settingsData.smtp_secure,
      })
      if (res.data?.statusCode === 200) {
        Notification('Success', res.data.message, 'success')
      } else {
        Notification('Error', res.data?.message || 'SMTP test failed', 'warning')
      }
    } catch (err) {
      Notification('Error', err?.response?.data?.message || err?.message || 'SMTP test failed', 'warning')
    }
    setSmtpTesting(false)
  }

  const defaultSettings = {
    smtp_enabled: false, smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '',
    smtp_from_email: '', smtp_from_name: '', smtp_secure: false,
    sms_enabled: false, sms_provider: '', sms_api_key: '', sms_api_secret: '', sms_from_number: '',
    whatsapp_enabled: false, whatsapp_provider: '', whatsapp_api_key: '', whatsapp_api_secret: '', whatsapp_from_number: '',
    logo_url: '', company_display_name: '', footer_address: '', footer_contact: '', footer_extra: '',
    location_code_mode: 'manual', location_code_prefix: '', location_code_next_seq: 1,
    employee_code_mode: 'manual', employee_code_prefix: '', employee_code_next_seq: 1,
    product_code_prefix: 'PRD', product_code_next_seq: 1,
    vendor_code_prefix: 'VND', vendor_code_next_seq: 1,
    // Per-module voucher prefixes (override the leading company prefix).
    lead_voucher_prefix: '', rfq_voucher_prefix: '', quotation_voucher_prefix: '',
    sales_order_voucher_prefix: '', invoice_voucher_prefix: '', po_vendor_voucher_prefix: '',
    grn_voucher_prefix: '', debit_note_voucher_prefix: '',
    payment_voucher_prefix: '',
  }
  const [settingsData, setSettingsData] = useState(defaultSettings)

  // Load settings on scope/location change
  useEffect(() => {
    const params = {}
    if (isCompanyAdmin) {
      if (settingsScope === 'location' && settingsLocationId) {
        params.locationId = settingsLocationId
      }
    } else if (isLocationAdmin) {
      if (selectedLocationId) params.locationId = selectedLocationId
    } else {
      if (selectedLocationId) params.locationId = selectedLocationId
    }
    dispatch(getCompanySettings(params))
  }, [settingsScope, settingsLocationId, selectedLocationId, isCompanyAdmin, isLocationAdmin, dispatch])

  // Sync store -> local state
  useEffect(() => {
    if (store.settings) {
      setSettingsData((prev) => ({ ...prev, ...store.settings }))
    }
  }, [store.settings])

  const handleChange = (field, value) => {
    setSettingsData((prev) => ({ ...prev, [field]: value }))
  }

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false)
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      Notification('Error', 'Only PNG, JPG, SVG, and WebP files are allowed', 'warning')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      Notification('Error', 'File size must be under 5MB', 'warning')
      return
    }
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const res = await instance.post(API_ENDPOINTS.companySettings.uploadLogo, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res?.data?.statusCode === 200 && res?.data?.data?.logo_url) {
        handleChange('logo_url', res.data.data.logo_url)
        Notification('Success', 'Logo uploaded successfully', 'success')
      } else {
        Notification('Error', res?.data?.message || 'Upload failed', 'warning')
      }
    } catch (err) {
      Notification('Error', err?.response?.data?.message || 'Upload failed', 'warning')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  // Resolve logo URL for preview
  const resolvedLogoUrl = (() => {
    const url = settingsData.logo_url || ''
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${hostRestApiUrl}${url}`
  })()

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const params = {}
      if (isCompanyAdmin) {
        if (settingsScope === 'location' && settingsLocationId) {
          params.locationId = settingsLocationId
        }
      } else if (selectedLocationId) {
        params.locationId = selectedLocationId
      }
      await dispatch(updateCompanySettings({ params, data: settingsData }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetLocationSettings = () => {
    const locId = isCompanyAdmin ? settingsLocationId : selectedLocationId
    if (!locId) return
    dispatch(resetCompanyLocationSettings({ locationId: locId }))
  }

  useEffect(() => {
    if (store.actionFlag === 'UPDATE_SETTINGS') {
      Notification('Success', 'Company settings updated.', 'success')
    }
    if (store.actionFlag === 'RESET_LOCATION_SETTINGS') {
      Notification('Success', 'Location settings reset to company defaults.', 'success')
    }
    if (store.error) Notification('Error', store.error, 'warning')
    if (store.actionFlag) dispatch(clearCompanySettingsActionFlag())
  }, [store.actionFlag, store.error, dispatch])

  // Notifications tab removed — managed per-module (Leave, Shift, Contract, Compliance)

  // Notification useEffects removed — managed per-module (Leave, Shift, Contract, Compliance)

  // Notification preference toggle handler
  const handlePrefToggle = (eventKey, channel) => {
    setLocalPrefs((prev) => {
      const existing = prev.find((p) => p.eventKey === eventKey)
      if (existing) {
        return prev.map((p) =>
          p.eventKey === eventKey ? { ...p, [channel]: !p[channel] } : p
        )
      }
      return [...prev, { eventKey, email: false, sms: false, whatsapp: false, [channel]: true }]
    })
  }

  const handleSavePreferences = async () => {
    setSubmitting(true)
    try {
      const params = {}
      if (isCompanyAdmin && settingsScope === 'location' && settingsLocationId) {
        params.locationId = settingsLocationId
      } else if (isLocationAdmin && selectedLocationId) {
        params.locationId = selectedLocationId
      }
      const payload = localPrefs
        .filter((p) => !COMPLIANCE_EVENT_KEYS.includes(p.eventKey))
        .map((p) => ({
          event_key: p.eventKey,
          email_enabled: p.email,
          sms_enabled: p.sms,
          whatsapp_enabled: p.whatsapp,
        }))
      await dispatch(updateNotificationPreferences({ params, data: { preferences: payload } }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!selectedEvent) return
    setSubmitting(true)
    try {
      const params = {}
      if (isCompanyAdmin && settingsScope === 'location' && settingsLocationId) {
        params.locationId = settingsLocationId
      } else if (isLocationAdmin && selectedLocationId) {
        params.locationId = selectedLocationId
      }
      await dispatch(updateNotificationTemplate({
        eventKey: selectedEvent.value,
        params,
        data: { channel: editTemplate.channel, subject: editTemplate.subject, body: editTemplate.body },
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevertTemplate = () => {
    const overrideTpl = notifStore.templates?.find(t => t.level === 'company' || t.level === 'location')
    if (overrideTpl?._id) {
      dispatch(deleteNotificationTemplate(overrideTpl._id))
    }
  }

  // Group events by module for display — exclude compliance (managed from /apps/compliance Settings tab)
  const COMPLIANCE_EVENT_KEYS = ['VISA_EXPIRY_WARNING', 'RTW_FOLLOWUP_DUE', 'UKVI_DEADLINE_WARNING', 'COMPLIANCE_EVENT_CREATED']

  const getGroupedEvents = () => {
    if (!notifStore.events || !Array.isArray(notifStore.events)) return {}
    const grouped = {}
    notifStore.events
      .filter((evt) => !COMPLIANCE_EVENT_KEYS.includes(evt.key))
      .forEach((evt) => {
        const module = evt.module || 'Other'
        if (!grouped[module]) grouped[module] = []
        grouped[module].push(evt)
      })
    return grouped
  }

  const getPrefForEvent = (eventKey) => {
    return localPrefs.find((p) => p.eventKey === eventKey) || { email: false, sms: false, whatsapp: false }
  }

  // Build event options for template selector — exclude compliance
  const eventOptions = notifStore.events
    ? notifStore.events
        .filter((evt) => !COMPLIANCE_EVENT_KEYS.includes(evt.key))
        .map((evt) => ({ value: evt.key, label: evt.name || evt.key, module: evt.module }))
    : []

  const selectStyles = {
    control: (base) => ({ ...base, minHeight: '32px', fontSize: '0.875rem' }),
    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
    input: (base) => ({ ...base, margin: 0, padding: 0, color: '#000' }),
    singleValue: (base) => ({ ...base, color: '#000' }),
    option: (base) => ({ ...base, color: '#000' }),
    indicatorsContainer: (base) => ({ ...base, height: '32px' }),
    dropdownIndicator: (base) => ({ ...base, padding: '4px' }),
    clearIndicator: (base) => ({ ...base, padding: '4px' }),
  }

  const MaskedInput = ({ field, label, type = 'text', ...rest }) => (
    <FormGroup>
      <Label className='form-label'>{label}</Label>
      <div className='input-group'>
        <Input
          type={showFields[field] ? 'text' : 'password'}
          value={settingsData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          {...rest}
        />
        <Button color='outline-secondary' size='sm' onClick={() => toggleShow(field)} style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
          {showFields[field] ? <EyeOff size={14} /> : <Eye size={14} />}
        </Button>
      </div>
    </FormGroup>
  )

  // Current Indian financial year (e.g. "2026-27") for voucher previews.
  const fyPreview = (() => {
    const d = new Date()
    const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
  })()

  // Unified document-numbering rows. 'counter' = simple running sequence
  // (Location / Employee); 'voucher' = FY-based voucher with a per-module prefix.
  const numberingRows = [
    { key: 'location', label: 'Location Code', type: 'counter', prefixField: 'location_code_prefix', modeField: 'location_code_mode', seqField: 'location_code_next_seq' },
    { key: 'employee', label: 'Employee Code', type: 'counter', prefixField: 'employee_code_prefix', modeField: 'employee_code_mode', seqField: 'employee_code_next_seq' },
    { key: 'product', label: 'Product Code', type: 'product', prefixField: 'product_code_prefix', seqField: 'product_code_next_seq' },
    { key: 'vendor', label: 'Vendor Code', type: 'product', prefixField: 'vendor_code_prefix', seqField: 'vendor_code_next_seq', defaultPrefix: 'VND' },
    { key: 'lead', label: 'Lead', type: 'voucher', prefixField: 'lead_voucher_prefix', token: 'RQ', style: 'separated' },
    { key: 'rfq', label: 'RFQ', type: 'voucher', prefixField: 'rfq_voucher_prefix', token: 'RFQ', style: 'glued' },
    { key: 'quotation', label: 'Quotation', type: 'voucher', prefixField: 'quotation_voucher_prefix', token: 'QT', style: 'glued' },
    { key: 'sales_order', label: 'Sales Order', type: 'voucher', prefixField: 'sales_order_voucher_prefix', token: 'SO', style: 'separated' },
    { key: 'invoice', label: 'Invoice', type: 'voucher', prefixField: 'invoice_voucher_prefix', token: 'INV', style: 'separated' },
    { key: 'po_vendor', label: 'PO Vendor', type: 'voucher', prefixField: 'po_vendor_voucher_prefix', token: 'VPO', style: 'separated' },
    { key: 'grn', label: 'GRN', type: 'voucher', prefixField: 'grn_voucher_prefix', token: 'GRN', style: 'glued' },
    { key: 'debit_note', label: 'Debit Note', type: 'voucher', prefixField: 'debit_note_voucher_prefix', token: 'DN', style: 'separated' },
    { key: 'payment_voucher', label: 'Vendor Payment', type: 'voucher', prefixField: 'payment_voucher_prefix', token: 'PV', style: 'separated' },
  ]

  const counterPreview = (row) =>
    `${(settingsData[row.prefixField] || '').toUpperCase()}${String(settingsData[row.seqField] || 1).padStart(4, '0')}`

  // Auto codes with a dash, e.g. PRD-0001 / VND-0001.
  const productPreview = (row) =>
    `${(settingsData[row.prefixField] || row.defaultPrefix || 'PRD').toUpperCase()}-${String(settingsData[row.seqField] || 1).padStart(4, '0')}`

  const voucherPreview = (row) => {
    const p = (settingsData[row.prefixField] || '').toUpperCase() || 'COMPANY'
    if (row.style === 'compact') return `${p}001/${fyPreview}`
    if (row.style === 'glued') return `${p}/${row.token}0001/${fyPreview}`
    return `${p}/${row.token}/0001/${fyPreview}`
  }

  const showForm = settingsScope !== 'location' || settingsLocationId || !isCompanyAdmin

  return (
    <Fragment>
      <SetupReturnBanner />
      <Card>
        <CardHeader className='border-bottom py-1'>
          <CardTitle tag='h4' className='mb-0'>Company Settings</CardTitle>
        </CardHeader>
      </Card>

      {/* Scope Selector -- Company Admin only */}
      {false && isCompanyAdmin && (
        <Card className='mb-1'>
          <CardBody className='py-1'>
            <Row className='g-2 align-items-center'>
              <Col md='auto'>
                <Label className='form-label small mb-0 me-1'>Settings Scope:</Label>
              </Col>
              <Col md='auto'>
                <ButtonGroup size='sm'>
                  <Button
                    color={settingsScope === 'company' ? 'primary' : 'outline-primary'}
                    onClick={() => { setSettingsScope('company'); setSettingsLocationId('') }}
                  >
                    Company Default
                  </Button>
                  <Button
                    color={settingsScope === 'location' ? 'primary' : 'outline-primary'}
                    onClick={() => setSettingsScope('location')}
                  >
                    By Location
                  </Button>
                </ButtonGroup>
              </Col>
              {settingsScope === 'location' && (
                <Col md={4}>
                  <Select
                    options={companyLocations.map(loc => ({ value: loc._id, label: loc.location_name || loc.name }))}
                    value={companyLocations.map(loc => ({ value: loc._id, label: loc.location_name || loc.name })).find(o => o.value === settingsLocationId) || null}
                    onChange={(opt) => setSettingsLocationId(opt?.value || '')}
                    placeholder='Select a location...'
                    isClearable
                    styles={selectStyles}
                  />
                </Col>
              )}
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Info Banners */}
      {false && isCompanyAdmin && settingsScope === 'company' && (
        <Alert color='info' className='d-flex align-items-center mb-1'>
          <Info size={16} className='me-75' />
          These settings apply to all locations without custom overrides.
        </Alert>
      )}

      {isCompanyAdmin && settingsScope === 'location' && !settingsLocationId && (
        <Alert color='secondary' className='mb-1'>
          Select a location above to view or customize its settings.
        </Alert>
      )}

      {settingsScope === 'location' && settingsLocationId && store.settingsInherited && (
        <Alert color='info' className='d-flex align-items-center mb-1'>
          <Info size={16} className='me-75' />
          Inherited from company defaults. Save to create custom settings for this location.
        </Alert>
      )}

      {settingsScope === 'location' && settingsLocationId && !store.settingsInherited && (
        <Alert color='warning' className='d-flex align-items-center justify-content-between mb-1'>
          <span>
            <Info size={16} className='me-75' />
            <Badge color='warning' className='me-75'>Location Override</Badge>
            This location has custom settings.
          </span>
          <Button color='outline-warning' size='sm' onClick={handleResetLocationSettings}>
            <RotateCcw size={14} className='me-50' />Reset to Company Defaults
          </Button>
        </Alert>
      )}

      {/* Location Admin banners */}
      {isLocationAdmin && store.settingsInherited && (
        <Alert color='info' className='d-flex align-items-center mb-1'>
          <Info size={16} className='me-75' />
          Using company defaults. Save to customize for this location.
        </Alert>
      )}

      {isLocationAdmin && !store.settingsInherited && store.settings && (
        <Alert color='warning' className='d-flex align-items-center justify-content-between mb-1'>
          <span>
            <Info size={16} className='me-75' />
            <Badge color='warning' className='me-75'>Custom Settings</Badge>
            This location has custom settings.
          </span>
          <Button color='outline-warning' size='sm' onClick={handleResetLocationSettings}>
            <RotateCcw size={14} className='me-50' />Reset to Company Defaults
          </Button>
        </Alert>
      )}

      {!store.loading ? (
        <div className='text-center py-3'><Spinner size='sm' /> Loading settings...</div>
      ) : showForm && (
        <>
          {/* Tabs */}
          <Nav tabs className='mb-1'>
            <NavItem>
              <NavLink active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
                <Settings size={14} className='me-50' />General
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'smtp'} onClick={() => setActiveTab('smtp')}>
                <Mail size={14} className='me-50' />Email (SMTP)
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'sms'} onClick={() => setActiveTab('sms')}>
                <MessageSquare size={14} className='me-50' />SMS
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')}>
                <Phone size={14} className='me-50' />WhatsApp
              </NavLink>
            </NavItem>
            {/* Branding tab hidden — the company logo now lives on the
                Company Profile page (beside Website). Footer/display-name
                fields kept in the (hidden) pane below for reversibility. */}
            {false && (
              <NavItem>
                <NavLink active={activeTab === 'branding'} onClick={() => setActiveTab('branding')}>
                  <Image size={14} className='me-50' />Branding
                </NavLink>
              </NavItem>
            )}
            {/* Notifications tab removed — managed per-module (Leave, Shift, Contract, Compliance) */}
          </Nav>

          <TabContent activeTab={activeTab}>
            {/* -- GENERAL TAB -- */}
            <TabPane tabId='general'>
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>Document Numbering</CardTitle>
                </CardHeader>
                <CardBody>
                  <small className='text-muted d-block mb-1'>
                    Set the prefix for each document. Location &amp; Employee use a
                    running sequence; sales &amp; purchase documents use a
                    financial-year voucher number. Edit a row and click Save.
                  </small>
                  <Table bordered responsive className='mb-0 align-middle'>
                    <thead className='table-light'>
                      <tr>
                        <th style={{ minWidth: 150 }}>Module</th>
                        <th style={{ width: 170 }}>Mode</th>
                        <th style={{ width: 160 }}>Prefix</th>
                        <th style={{ width: 130 }}>Next #</th>
                        <th>Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numberingRows.map((row) => (
                        <tr key={row.key}>
                          <td className='fw-bold'>{row.label}</td>
                          <td>
                            {row.type === 'counter' ? (
                              <Input type='select' bsSize='sm'
                                value={settingsData[row.modeField] || 'manual'}
                                onChange={(e) => handleChange(row.modeField, e.target.value)}>
                                <option value='manual'>Manual</option>
                                <option value='auto'>Auto-generate</option>
                              </Input>
                            ) : row.type === 'product' ? (
                              <span className='text-muted small'>Auto</span>
                            ) : (
                              <span className='text-muted small'>Auto (FY)</span>
                            )}
                          </td>
                          <td>
                            <Input type='text' bsSize='sm'
                              maxLength={row.type === 'voucher' ? 15 : 10}
                              style={{ textTransform: 'uppercase' }}
                              value={settingsData[row.prefixField] || ''}
                              onChange={(e) => handleChange(row.prefixField, e.target.value.toUpperCase())}
                              placeholder={row.type === 'product' ? 'e.g. PRD' : row.type === 'counter' ? 'e.g. LOC' : 'e.g. SHIVA'} />
                          </td>
                          <td>
                            {row.type === 'counter' || row.type === 'product' ? (
                              <Input type='number' bsSize='sm' min={1}
                                value={settingsData[row.seqField] || 1}
                                onChange={(e) => handleChange(row.seqField, Math.max(1, +e.target.value))} />
                            ) : (
                              <span className='text-muted small'>Auto</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {row.type === 'counter' ? counterPreview(row) : row.type === 'product' ? productPreview(row) : voucherPreview(row)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <small className='text-muted d-block mt-1'>
                    Leave a sales/purchase prefix blank to keep the default company
                    prefix. Changes apply to newly-created documents only.
                  </small>
                </CardBody>
              </Card>
            </TabPane>

            {/* -- SMTP TAB -- */}
            <TabPane tabId='smtp'>
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>Email (SMTP) Configuration</CardTitle>
                </CardHeader>
                <CardBody>
                  <FormGroup className='d-flex align-items-center justify-content-between'>
                    <Label className='form-label mb-0'>Enable SMTP</Label>
                    <Input type='switch' checked={settingsData.smtp_enabled}
                      onChange={(e) => handleChange('smtp_enabled', e.target.checked)} />
                  </FormGroup>
                  {settingsData.smtp_enabled && (
                    <>
                      <Row>
                        <Col md={8}>
                          <FormGroup>
                            <Label className='form-label'>SMTP Host</Label>
                            <Input type='text' value={settingsData.smtp_host || ''}
                              onChange={(e) => handleChange('smtp_host', e.target.value)}
                              placeholder='e.g. smtp.gmail.com' />
                          </FormGroup>
                        </Col>
                        <Col md={2}>
                          <FormGroup>
                            <Label className='form-label'>Port</Label>
                            <Input type='number' min={1} max={65535} value={settingsData.smtp_port}
                              onChange={(e) => handleChange('smtp_port', +e.target.value)} />
                          </FormGroup>
                        </Col>
                        <Col md={2}>
                          <FormGroup className='d-flex align-items-center justify-content-between mt-2'>
                            <Label className='form-label mb-0'>Secure (TLS)</Label>
                            <Input type='switch' checked={settingsData.smtp_secure}
                              onChange={(e) => handleChange('smtp_secure', e.target.checked)} />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <FormGroup>
                            <Label className='form-label'>Username</Label>
                            <Input type='text' value={settingsData.smtp_username || ''}
                              onChange={(e) => handleChange('smtp_username', e.target.value)} />
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <MaskedInput field='smtp_password' label='Password' />
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <FormGroup>
                            <Label className='form-label'>From Email</Label>
                            <Input type='email' value={settingsData.smtp_from_email || ''}
                              onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                              placeholder='noreply@yourcompany.com' />
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <FormGroup>
                            <Label className='form-label'>From Name</Label>
                            <Input type='text' value={settingsData.smtp_from_name || ''}
                              onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                              placeholder='Your Company Name' />
                          </FormGroup>
                        </Col>
                      </Row>
                      <div className='mt-1'>
                        <Button color='outline-primary' size='sm' disabled={smtpTesting} onClick={handleTestSmtp}>
                          {smtpTesting ? <><Spinner size='sm' className='me-50' />Sending...</> : <><Mail size={14} className='me-50' />Send Test Email</>}
                        </Button>
                        <small className='text-muted ms-1'>Sends a test email to your admin email address</small>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </TabPane>

            {/* -- SMS TAB -- */}
            <TabPane tabId='sms'>
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>SMS Configuration</CardTitle>
                </CardHeader>
                <CardBody>
                  <FormGroup className='d-flex align-items-center justify-content-between'>
                    <Label className='form-label mb-0'>Enable SMS</Label>
                    <Input type='switch' checked={settingsData.sms_enabled}
                      onChange={(e) => handleChange('sms_enabled', e.target.checked)} />
                  </FormGroup>
                  {settingsData.sms_enabled && (
                    <>
                      <FormGroup>
                        <Label className='form-label'>Provider</Label>
                        <Input type='select' value={settingsData.sms_provider || ''}
                          onChange={(e) => handleChange('sms_provider', e.target.value)}>
                          <option value=''>Select Provider</option>
                          <option value='twilio'>Twilio</option>
                          <option value='vonage'>Vonage</option>
                        </Input>
                      </FormGroup>
                      <Row>
                        <Col md={6}>
                          <MaskedInput field='sms_api_key' label='API Key' />
                        </Col>
                        <Col md={6}>
                          <MaskedInput field='sms_api_secret' label='API Secret' />
                        </Col>
                      </Row>
                      <FormGroup>
                        <Label className='form-label'>From Number</Label>
                        <Input type='text' value={settingsData.sms_from_number || ''}
                          onChange={(e) => handleChange('sms_from_number', e.target.value)}
                          placeholder='+1234567890' />
                      </FormGroup>
                    </>
                  )}
                </CardBody>
              </Card>
            </TabPane>

            {/* -- WHATSAPP TAB -- */}
            <TabPane tabId='whatsapp'>
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>WhatsApp Configuration</CardTitle>
                </CardHeader>
                <CardBody>
                  <FormGroup className='d-flex align-items-center justify-content-between'>
                    <Label className='form-label mb-0'>Enable WhatsApp</Label>
                    <Input type='switch' checked={settingsData.whatsapp_enabled}
                      onChange={(e) => handleChange('whatsapp_enabled', e.target.checked)} />
                  </FormGroup>
                  {settingsData.whatsapp_enabled && (
                    <>
                      <FormGroup>
                        <Label className='form-label'>Provider</Label>
                        <Input type='select' value={settingsData.whatsapp_provider || ''}
                          onChange={(e) => handleChange('whatsapp_provider', e.target.value)}>
                          <option value=''>Select Provider</option>
                          <option value='twilio'>Twilio</option>
                          <option value='meta'>Meta (Cloud API)</option>
                        </Input>
                      </FormGroup>
                      <MaskedInput field='whatsapp_api_key' label='API Key' />
                      {settingsData.whatsapp_provider === 'twilio' && (
                        <MaskedInput field='whatsapp_api_secret' label='API Secret (Auth Token)' />
                      )}
                      <FormGroup>
                        <Label className='form-label'>From Number</Label>
                        <Input type='text' value={settingsData.whatsapp_from_number || ''}
                          onChange={(e) => handleChange('whatsapp_from_number', e.target.value)}
                          placeholder='+1234567890' />
                      </FormGroup>
                    </>
                  )}
                </CardBody>
              </Card>
            </TabPane>

            {/* -- BRANDING TAB (hidden — logo moved to Company Profile) -- */}
            {false && <TabPane tabId='branding'>
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>Branding & Footer</CardTitle>
                </CardHeader>
                <CardBody>
                  <Alert color='info' className='mb-2'>
                    <Info size={14} className='me-50' />
                    These branding values will be used in company emails and contract templates.
                  </Alert>
                  <FormGroup>
                    <Label className='form-label'>Company Logo</Label>
                    <div className='d-flex align-items-center gap-2 mb-1'>
                      {resolvedLogoUrl && (
                        <img src={resolvedLogoUrl} alt='Logo preview'
                          style={{ maxHeight: '60px', maxWidth: '200px', border: '1px solid #eee', borderRadius: '4px', padding: '4px' }}
                          onError={(e) => { e.target.style.display = 'none' }} />
                      )}
                      <div>
                        <Label className='btn btn-outline-primary btn-sm mb-0 d-flex align-items-center gap-50' style={{ cursor: 'pointer' }}>
                          <Upload size={14} />
                          {logoUploading ? 'Uploading...' : 'Upload Logo'}
                          <Input type='file' accept='image/png,image/jpeg,image/svg+xml,image/webp'
                            onChange={handleLogoUpload} hidden disabled={logoUploading} />
                        </Label>
                        <small className='text-muted d-block mt-50'>PNG, JPG, SVG or WebP. Max 5MB.</small>
                      </div>
                    </div>
                    {settingsData.logo_url && (
                      <small className='text-muted'>Current: {settingsData.logo_url}</small>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label className='form-label'>Company Display Name</Label>
                    <Input type='text' value={settingsData.company_display_name || ''}
                      onChange={(e) => handleChange('company_display_name', e.target.value)} />
                  </FormGroup>
                  <FormGroup>
                    <Label className='form-label'>Footer Address</Label>
                    <Input type='textarea' rows={2} value={settingsData.footer_address || ''}
                      onChange={(e) => handleChange('footer_address', e.target.value)}
                      placeholder='123 Business St, City, Country' />
                  </FormGroup>
                  <FormGroup>
                    <Label className='form-label'>Footer Contact</Label>
                    <Input type='textarea' rows={2} value={settingsData.footer_contact || ''}
                      onChange={(e) => handleChange('footer_contact', e.target.value)}
                      placeholder='Phone: +1 234 567 890 | Email: info@company.com' />
                  </FormGroup>
                  <FormGroup>
                    <Label className='form-label'>Footer Extra</Label>
                    <Input type='textarea' rows={2} value={settingsData.footer_extra || ''}
                      onChange={(e) => handleChange('footer_extra', e.target.value)}
                      placeholder='Company registration number, VAT, etc.' />
                  </FormGroup>
                </CardBody>
              </Card>
            </TabPane>}

            {/* Notifications tab removed — managed per-module (Leave, Shift, Contract, Compliance) */}
            {false && <TabPane tabId='notifications'>
              {/* Section A: Notification Preferences Grid */}
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>Notification Preferences</CardTitle>
                </CardHeader>
                <CardBody>
                  {notifStore.loading ? (
                    <div className='text-center py-3'><Spinner size='sm' /> Loading preferences...</div>
                  ) : notifStore.events && Array.isArray(notifStore.events) && notifStore.events.length > 0 ? (
                    <>
                      <Table bordered responsive className='mb-1'>
                        <thead>
                          <tr>
                            <th style={{ width: '50%' }}>Event</th>
                            <th className='text-center' style={{ width: '16%' }}>Email</th>
                            <th className='text-center' style={{ width: '16%' }}>SMS</th>
                            <th className='text-center' style={{ width: '16%' }}>WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(getGroupedEvents()).map(([module, events]) => (
                            <Fragment key={module}>
                              <tr>
                                <td colSpan={4} className='bg-light'>
                                  <strong>{module}</strong>
                                </td>
                              </tr>
                              {events.map((evt) => {
                                const pref = getPrefForEvent(evt.key)
                                return (
                                  <tr key={evt.key}>
                                    <td className='ps-3'>{evt.name || evt.key}</td>
                                    <td className='text-center'>
                                      <Input
                                        type='switch'
                                        checked={!!pref.email}
                                        onChange={() => handlePrefToggle(evt.key, 'email')}
                                      />
                                    </td>
                                    <td className='text-center'>
                                      <Input
                                        type='switch'
                                        checked={!!pref.sms}
                                        onChange={() => handlePrefToggle(evt.key, 'sms')}
                                      />
                                    </td>
                                    <td className='text-center'>
                                      <Input
                                        type='switch'
                                        checked={!!pref.whatsapp}
                                        onChange={() => handlePrefToggle(evt.key, 'whatsapp')}
                                      />
                                    </td>
                                  </tr>
                                )
                              })}
                            </Fragment>
                          ))}
                        </tbody>
                      </Table>
                      <div className='d-flex justify-content-end'>
                        <Button color='primary' onClick={handleSavePreferences}>
                          Save Preferences
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className='text-muted mb-0'>No notification events available.</p>
                  )}
                </CardBody>
              </Card>

              {/* Section B: Template Editor */}
              <Card>
                <CardHeader className='border-bottom py-1'>
                  <CardTitle tag='h5' className='mb-0'>
                    <Edit3 size={16} className='me-50' />Template Editor
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <FormGroup>
                    <Label className='form-label'>Select Event</Label>
                    <Select
                      options={eventOptions}
                      value={selectedEvent}
                      onChange={(opt) => setSelectedEvent(opt)}
                      placeholder='Choose a notification event...'
                      isClearable
                      styles={selectStyles}
                    />
                  </FormGroup>

                  {selectedEvent && notifStore.templates && (
                    <>
                      {/* System template reference (read-only) */}
                      {notifStore.templates.filter(t => t.level === 'system').map((tpl) => (
                        <Card key={tpl._id || 'system'} className='border mb-1'>
                          <CardHeader className='py-75 bg-light border-bottom'>
                            <CardTitle tag='h6' className='mb-0'>
                              <Badge color='secondary' className='me-50'>System Default</Badge>
                              {tpl.channel ? tpl.channel.toUpperCase() : 'EMAIL'} Template
                            </CardTitle>
                          </CardHeader>
                          <CardBody className='py-1'>
                            {tpl.subject && (
                              <FormGroup>
                                <Label className='form-label small text-muted'>Subject</Label>
                                <Input type='text' value={tpl.subject} disabled className='bg-light' />
                              </FormGroup>
                            )}
                            <FormGroup className='mb-0'>
                              <Label className='form-label small text-muted'>Body</Label>
                              <Input type='textarea' rows={4} value={tpl.body || ''} disabled className='bg-light' />
                            </FormGroup>
                          </CardBody>
                        </Card>
                      ))}

                      {/* Editable override */}
                      <Card className='border mb-1'>
                        <CardHeader className='py-75 border-bottom'>
                          <CardTitle tag='h6' className='mb-0'>
                            <Badge color='primary' className='me-50'>
                              {settingsScope === 'location' && settingsLocationId ? 'Location' : 'Company'} Override
                            </Badge>
                            Edit Template
                          </CardTitle>
                        </CardHeader>
                        <CardBody className='py-1'>
                          <FormGroup>
                            <Label className='form-label'>Channel</Label>
                            <Input type='select' value={editTemplate.channel}
                              onChange={(e) => setEditTemplate((prev) => ({ ...prev, channel: e.target.value }))}>
                              <option value='email'>Email</option>
                              <option value='sms'>SMS</option>
                              <option value='whatsapp'>WhatsApp</option>
                            </Input>
                          </FormGroup>
                          {editTemplate.channel === 'email' && (
                            <FormGroup>
                              <Label className='form-label'>Subject</Label>
                              <Input type='text' value={editTemplate.subject}
                                onChange={(e) => setEditTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                                placeholder='Email subject line...' />
                            </FormGroup>
                          )}
                          <FormGroup>
                            <Label className='form-label'>Body {editTemplate.channel === 'email' ? '(HTML)' : ''}</Label>
                            <Input type='textarea' rows={6} value={editTemplate.body}
                              onChange={(e) => setEditTemplate((prev) => ({ ...prev, body: e.target.value }))}
                              placeholder={editTemplate.channel === 'email' ? 'HTML template body...' : 'Message body...'} />
                          </FormGroup>
                          <small className='text-muted d-block mb-1'>
                            Available placeholders: {'{{employeeName}}, {{companyName}}, {{locationName}}, {{date}}, {{status}}'} etc.
                          </small>
                          <div className='d-flex gap-1'>
                            <Button color='primary' onClick={handleSaveTemplate}>
                              Save Override
                            </Button>
                            {notifStore.templates?.some(t => t.level === 'company' || t.level === 'location') && (
                              <Button color='outline-warning' onClick={handleRevertTemplate}>
                                <RotateCcw size={14} className='me-50' />Revert to System Default
                              </Button>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    </>
                  )}
                </CardBody>
              </Card>
            </TabPane>}


          </TabContent>

          <div className='d-flex justify-content-end mb-2'>
            <Button color='primary' onClick={handleSave} disabled={!store.loading}>
              {!store.loading ? <><Spinner size='sm' className='me-50' />Saving...</> : 'Save Settings'}
            </Button>
          </div>
        </>
      )}
    </Fragment>
  )
}

export default CompanySettingsPage
