import React, { useState, useEffect, useCallback } from 'react'
import { Row, Col, Label, Input, Button, Spinner, FormGroup, Alert } from 'reactstrap'
import Select from 'react-select'
import { useTranslation } from 'react-i18next'
import instance from '@src/utility/AxiosConfig'
import Notification from '@components/toast/notification'
import useFormLoading from '@src/hooks/useFormLoading'

const CHANNELS = ['email', 'sms', 'whatsapp']
const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

// Fix react-select text visibility in dark themes / z-index
const selectStyles = {
  control: (base) => ({ ...base, minHeight: '38px' }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    color: state.isSelected ? '#fff' : '#333',
    backgroundColor: state.isSelected ? '#09418B' : state.isFocused ? '#f0f0f0' : '#fff',
  }),
  singleValue: (base) => ({ ...base, color: '#333' }),
}

/**
 * Reusable Notification Settings Panel.
 * Props:
 *   events — array of { key: string, label: string }
 */
const NotificationSettingsPanel = ({ events = [] }) => {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  useFormLoading(saving)

  // ── Preferences ──
  const [prefs, setPrefs] = useState([])
  const [prefsLoading, setPrefsLoading] = useState(true)

  // ── Template Editor ──
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_OPTIONS[0])
  const [tplLoading, setTplLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')

  const eventOptions = events.map(e => ({ value: e.key, label: t(e.label) }))

  // ── Load preferences ──
  useEffect(() => {
    setPrefsLoading(true)
    instance.get('/admin/notification/preferences')
      .then((res) => {
        const data = res?.data?.data || []
        const list = Array.isArray(data) ? data : []
        const normalized = events.map((evt) => {
          const found = list.find(p => (p.event_key || p.eventKey) === evt.key)
          return {
            eventKey: evt.key,
            email: found ? (found.email_enabled ?? found.email ?? true) : true,
            sms: found ? (found.sms_enabled ?? found.sms ?? false) : false,
            whatsapp: found ? (found.whatsapp_enabled ?? found.whatsapp ?? false) : false,
            notify_employee: found ? (found.notify_employee ?? true) : true,
            notify_location_admin: found ? (found.notify_location_admin ?? true) : true,
            notify_company_admin: found ? (found.notify_company_admin ?? false) : false,
          }
        })
        setPrefs(normalized)
      })
      .catch(() => {
        setPrefs(events.map(e => ({
          eventKey: e.key,
          email: true,
          sms: false,
          whatsapp: false,
          notify_employee: true,
          notify_location_admin: true,
          notify_company_admin: false,
        })))
      })
      .finally(() => setPrefsLoading(false))
  }, [])

  const togglePref = (eventKey, field) => {
    setPrefs(prev => prev.map(p => p.eventKey === eventKey ? { ...p, [field]: !p[field] } : p))
  }

  const savePrefs = async () => {
    setSaving(true)
    try {
      const payload = prefs.map(p => ({
        event_key: p.eventKey,
        email_enabled: p.email,
        sms_enabled: p.sms,
        whatsapp_enabled: p.whatsapp,
        notify_employee: p.notify_employee,
        notify_location_admin: p.notify_location_admin,
        notify_company_admin: p.notify_company_admin,
      }))
      await instance.put('/admin/notification/preferences', { preferences: payload })
      Notification('Success', t('Notification preferences saved'), 'success')
    } catch (err) {
      Notification('Error', err?.response?.data?.message || t('Failed to save'), 'warning')
    } finally {
      setSaving(false)
    }
  }

  // ── Template Loading ──
  const loadTemplates = useCallback(async (eventKey) => {
    if (!eventKey) { setTemplates([]); return }
    setTplLoading(true)
    try {
      const res = await instance.get(`/admin/notification/templates/${eventKey}`)
      const data = res?.data?.data || []
      setTemplates(Array.isArray(data) ? data : [data])
    } catch {
      setTemplates([])
    } finally {
      setTplLoading(false)
    }
  }, [])

  // Update editor when templates load or channel changes
  useEffect(() => {
    if (!selectedEvent || !selectedChannel) return
    const ch = selectedChannel.value
    const custom = templates.find(t => (t.level === 'company' || t.level === 'location') && t.channel === ch)
    const system = templates.find(t => t.level === 'system' && t.channel === ch)
    if (custom) {
      setCustomSubject(custom.subject || '')
      setCustomBody(custom.body || '')
    } else if (system) {
      // Pre-fill with system template so admin can see and modify
      setCustomSubject(system.subject || '')
      setCustomBody('')
    } else {
      setCustomSubject('')
      setCustomBody('')
    }
  }, [templates, selectedChannel, selectedEvent])

  const handleEventSelect = (opt) => {
    setSelectedEvent(opt)
    setSelectedChannel(CHANNEL_OPTIONS[0])
    if (opt) loadTemplates(opt.value)
    else { setTemplates([]); setCustomSubject(''); setCustomBody('') }
  }

  const handleChannelSelect = (opt) => {
    setSelectedChannel(opt || CHANNEL_OPTIONS[0])
  }

  const getSystemTpl = () => {
    if (!selectedChannel) return null
    return templates.find(t => t.level === 'system' && t.channel === selectedChannel.value) || null
  }

  const getCustomTpl = () => {
    if (!selectedChannel) return null
    return templates.find(t => (t.level === 'company' || t.level === 'location') && t.channel === selectedChannel.value) || null
  }

  const saveTemplate = async () => {
    if (!selectedEvent?.value || !selectedChannel?.value) return
    if (!customBody.trim()) {
      Notification('Warning', t('Template body cannot be empty'), 'warning')
      return
    }
    setSaving(true)
    try {
      await instance.put(`/admin/notification/templates/${selectedEvent.value}`, {
        channel: selectedChannel.value,
        subject: selectedChannel.value === 'email' ? customSubject : undefined,
        body: customBody,
      })
      Notification('Success', t('Template saved'), 'success')
      loadTemplates(selectedEvent.value)
    } catch (err) {
      Notification('Error', err?.response?.data?.message || t('Failed to save'), 'warning')
    } finally {
      setSaving(false)
    }
  }

  const resetTemplate = async () => {
    const custom = getCustomTpl()
    if (!custom?._id) return
    setSaving(true)
    try {
      await instance.delete(`/admin/notification/templates/${custom._id}`)
      Notification('Success', t('Template reset to system default'), 'success')
      loadTemplates(selectedEvent.value)
    } catch (err) {
      Notification('Error', err?.response?.data?.message || t('Failed to reset'), 'warning')
    } finally {
      setSaving(false)
    }
  }

  const isEmail = selectedChannel?.value === 'email'
  const systemTpl = getSystemTpl()
  const customTpl = getCustomTpl()

  // Strip HTML for preview (system email templates are .hbs files)
  const previewBody = (body) => {
    if (!body) return ''
    if (body.endsWith('.hbs') || body.endsWith('.hjs')) return `[Template file: ${body}]`
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500)
  }

  return (
    <div>
      {/* ── Notification Preferences ── */}
      <h6 className='fw-bold text-uppercase text-muted mb-1'>{t('Notification Preferences')}</h6>
      <hr className='mt-0 mb-2' />
      {prefsLoading ? (
        <div className='text-center py-3'><Spinner size='sm' /></div>
      ) : (
        <>
          <div className='table-responsive mb-1'>
            <table className='table table-bordered mb-0' style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th rowSpan={2} style={{ verticalAlign: 'middle' }}>{t('Event')}</th>
                  <th colSpan={3} className='text-center'>{t('Channels')}</th>
                  <th colSpan={3} className='text-center'>{t('Recipients')}</th>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <th className='text-center'>{t('Email')}</th>
                  <th className='text-center'>{t('SMS')}</th>
                  <th className='text-center'>{t('WhatsApp')}</th>
                  <th className='text-center'>{t('Employee')}</th>
                  <th className='text-center'>{t('Location Admin')}</th>
                  <th className='text-center'>{t('Company Admin')}</th>
                </tr>
              </thead>
              <tbody>
                {prefs.map(p => {
                  const evt = events.find(e => e.key === p.eventKey)
                  return (
                    <tr key={p.eventKey}>
                      <td>{t(evt?.label || p.eventKey)}</td>
                      {CHANNELS.map(ch => (
                        <td key={ch} className='text-center'>
                          <Input type='checkbox' checked={!!p[ch]}
                            onChange={() => togglePref(p.eventKey, ch)} style={{ cursor: 'pointer' }} />
                        </td>
                      ))}
                      <td className='text-center'>
                        <Input type='checkbox' checked={!!p.notify_employee}
                          onChange={() => togglePref(p.eventKey, 'notify_employee')} style={{ cursor: 'pointer' }} />
                      </td>
                      <td className='text-center'>
                        <Input type='checkbox' checked={!!p.notify_location_admin}
                          onChange={() => togglePref(p.eventKey, 'notify_location_admin')} style={{ cursor: 'pointer' }} />
                      </td>
                      <td className='text-center'>
                        <Input type='checkbox' checked={!!p.notify_company_admin}
                          onChange={() => togglePref(p.eventKey, 'notify_company_admin')} style={{ cursor: 'pointer' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Button color='primary' size='sm' onClick={savePrefs} disabled={saving}>
            {saving ? <Spinner size='sm' /> : t('Save Preferences')}
          </Button>
        </>
      )}

      {/* ── Notification Templates ── */}
      <h6 className='fw-bold text-uppercase text-muted mb-1 mt-3'>{t('Notification Templates')}</h6>
      <hr className='mt-0 mb-2' />
      <Row>
        <Col md={5} className='mb-1'>
          <Label className='small fw-semibold'>{t('Event')}</Label>
          <Select isClearable options={eventOptions} value={selectedEvent}
            onChange={handleEventSelect} placeholder={t('Select event...')} styles={selectStyles} />
        </Col>
        <Col md={3} className='mb-1'>
          <Label className='small fw-semibold'>{t('Channel')}</Label>
          <Select options={CHANNEL_OPTIONS} value={selectedChannel}
            onChange={handleChannelSelect} isDisabled={!selectedEvent} styles={selectStyles} />
        </Col>
      </Row>

      {tplLoading && <div className='text-center py-3'><Spinner size='sm' /></div>}

      {!tplLoading && selectedEvent && selectedChannel && (
        <>
          {/* System template reference */}
          {systemTpl ? (
            <Alert color='light' className='mb-2 py-1 px-2'>
              <div className='small fw-bold text-muted mb-50'>{t('System Default')} — {selectedChannel.label}</div>
              {isEmail && systemTpl.subject && (
                <div className='small'><strong>{t('Subject')}:</strong> {systemTpl.subject}</div>
              )}
              <div className='small' style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'auto' }}>
                <strong>{t('Body')}:</strong> {previewBody(systemTpl.body)}
              </div>
            </Alert>
          ) : (() => {
            // No system template for this channel — try to show SMS as reference
            const smsFallback = templates.find(t => t.level === 'system' && t.channel === 'sms')
            return (
              <Alert color='light' className='mb-2 py-1 px-2'>
                <div className='small fw-bold text-muted mb-50'>{t('No system default for')} {selectedChannel.label}</div>
                {smsFallback ? (
                  <div className='small'><strong>{t('SMS template (reference)')}:</strong> {smsFallback.body}</div>
                ) : (
                  <div className='small text-muted'>{t('Create a custom template below.')}</div>
                )}
              </Alert>
            )
          })()}

          {/* Custom template editor */}
          {isEmail && (
            <FormGroup>
              <Label className='small fw-semibold'>{t('Subject')}</Label>
              <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)}
                placeholder={t('Email subject line...')} />
            </FormGroup>
          )}
          <FormGroup>
            <Label className='small fw-semibold'>
              {isEmail ? t('Body (HTML or plain text)') : t('Message Text')}
            </Label>
            <Input type='textarea' rows={isEmail ? 8 : 4} value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder={isEmail ? t('Email body content...') : t('Short message text...')} />
            <small className='text-muted'>
              {t('Variables')}: {'{{recipient_name}}, {{employee_name}}, {{leave_type}}, {{start_date}}, {{end_date}}, {{total_days}}'}
            </small>
          </FormGroup>
          <div className='d-flex gap-1'>
            <Button color='primary' size='sm' onClick={saveTemplate} disabled={saving || !customBody.trim()}>
              {saving ? <Spinner size='sm' /> : t('Save Template')}
            </Button>
            {customTpl && (
              <Button color='outline-danger' size='sm' onClick={resetTemplate} disabled={saving}>
                {t('Reset to Default')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationSettingsPanel
