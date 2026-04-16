import React, { Fragment, useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Card, CardBody, CardHeader, CardTitle, Button, Row, Col, Spinner,
  Badge, Progress, Alert,
} from 'reactstrap'
import {
  CheckCircle, XCircle, ArrowRight, ArrowLeft, Settings,
} from 'react-feather'
import { useTranslation } from 'react-i18next'
import { appsRoot } from '@constant/defaultValues'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'
import Notification from '@components/toast/notification'

const CompanySetupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const authStore = useSelector((s) => s.auth)
  const roleName = (authStore?.authUserItem?.role?.name || '').toLowerCase()
  const isCompanyAdmin = roleName === 'company admin'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const loadChecklist = useCallback(() => {
    setLoading(true)
    instance.get(API_ENDPOINTS.companySettings.setupStatus)
      .then(res => { if (res.data?.data?.setup_completed) setAlreadyCompleted(true) })
      .catch(() => {})
    instance.get(API_ENDPOINTS.dashboard.companyStats)
      .then(res => {
        const cl = res.data?.data?.setupChecklist
        if (cl?.items) {
          setItems(cl.items)
          const idx = cl.items.findIndex(i => !i.done)
          if (idx >= 0) setActiveStep(idx)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadChecklist() }, [loadChecklist])

  const completedCount = items.filter(i => i.done).length
  const totalSteps = items.length
  const allComplete = totalSteps > 0 && completedCount === totalSteps
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  const handleCompleteSetup = async () => {
    setCompleting(true)
    try {
      await instance.put(API_ENDPOINTS.companySettings.setupComplete)
      Notification('Success', t('Setup completed! Redirecting to dashboard...'), 'success')
      setTimeout(() => navigate(`${appsRoot}/dashboard`), 1000)
    } catch {
      Notification('Error', t('Failed to complete setup'), 'warning')
    }
    setCompleting(false)
  }

  const handleGoToStep = (link) => {
    localStorage.setItem('setupReturnUrl', `${appsRoot}/setup`)
    navigate(link)
  }

  if (!isCompanyAdmin) {
    return (
      <div className="text-center py-5">
        <h4>{t("Access Denied")}</h4>
        <p className="text-muted">{t("Only Company Admins can access the setup wizard.")}</p>
        <Button color="primary" onClick={() => navigate(`${appsRoot}/dashboard`)}>{t("Go to Dashboard")}</Button>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-5"><Spinner color="primary" /></div>
  }

  return (
    <Fragment>
      <div className="main-content">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h3 className="mb-25"><Settings size={20} className="me-75" />{t("Company Setup")}</h3>
            <p className="text-muted mb-0">{t("Complete the following steps to configure your account")}</p>
          </div>
          <div className="d-flex align-items-center gap-1">
            <div style={{ minWidth: 120 }}>
              <div className="d-flex justify-content-between mb-25">
                <small className="text-muted">{t("Progress")}</small>
                <small className="fw-semibold">{completedCount}/{totalSteps}</small>
              </div>
              <Progress value={progressPct} color={allComplete ? 'success' : 'primary'} style={{ height: 8 }} />
            </div>
            {allComplete && (
              <Button color="success" onClick={handleCompleteSetup} disabled={completing}>
                {completing ? <Spinner size="sm" /> : <><CheckCircle size={16} className="me-50" />{t("Complete Setup")}</>}
              </Button>
            )}
          </div>
        </div>

        {alreadyCompleted && (
          <Alert color="info" className="mb-2 d-flex align-items-center justify-content-between">
            <span><CheckCircle size={16} className="me-50" />{t("Setup has been completed. You can review your settings or go to the dashboard.")}</span>
            <Button color="primary" size="sm" onClick={() => navigate(`${appsRoot}/dashboard`)}>{t("Go to Dashboard")}</Button>
          </Alert>
        )}

        {allComplete && !alreadyCompleted && (
          <Alert color="success" className="mb-2">
            <CheckCircle size={16} className="me-50" />
            {t("All steps are complete! Click 'Complete Setup' to start using PeopleGem.")}
          </Alert>
        )}

        <Row>
          {/* Left: Step Navigation */}
          <Col xl={4} lg={5} md={12} className="mb-2">
            <Card>
              <CardBody className="p-0">
                {items.map((item, i) => {
                  const isActive = activeStep === i
                  return (
                    <div
                      key={item.key}
                      className={`d-flex align-items-center gap-75 px-1 py-75 border-bottom ${isActive ? 'bg-light-primary' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveStep(i)}
                    >
                      <div className={`avatar avatar-stats p-25 m-0 ${item.done ? 'bg-light-success' : 'bg-light-secondary'}`}
                        style={{ width: 32, height: 32, minWidth: 32 }}>
                        <div className="avatar-content">
                          {item.done ? <CheckCircle size={16} /> : <span className="fw-bold small">{i + 1}</span>}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className={`small ${item.done ? 'text-success' : isActive ? 'fw-bold' : ''}`}>
                          {t(item.label)}
                        </div>
                      </div>
                      {item.done && <Badge color="light-success" pill className="small">Done</Badge>}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          </Col>

          {/* Right: Step Content */}
          <Col xl={8} lg={7} md={12}>
            {items.map((item, i) => {
              if (activeStep !== i) return null
              return (
                <Card key={item.key}>
                  <CardHeader className="border-bottom py-1">
                    <div className="d-flex align-items-center gap-75">
                      <div className={`avatar avatar-stats p-50 m-0 ${item.done ? 'bg-light-success' : 'bg-light-primary'}`}>
                        <div className="avatar-content"><Settings size={20} /></div>
                      </div>
                      <div>
                        <CardTitle tag="h5" className="mb-0">{t(`Step ${i + 1}: ${item.label}`)}</CardTitle>
                        <small className="text-muted">{t(item.description)}</small>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {item.done ? (
                      <div className="text-center py-3">
                        <CheckCircle size={48} className="text-success mb-1" />
                        <h5 className="text-success">{t("Completed")}</h5>
                        <p className="text-muted">{t("This step has been configured. You can update it anytime.")}</p>
                        <Button color="outline-primary" size="sm" onClick={() => handleGoToStep(item.link)}>
                          {t("Review Settings")} <ArrowRight size={14} className="ms-50" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <XCircle size={48} className="text-danger mb-1" />
                        <h5>{t("Not Configured")}</h5>
                        <p className="text-muted">{t(item.description)}</p>
                        <Button color="primary" onClick={() => handleGoToStep(item.link)}>
                          {t("Configure Now")} <ArrowRight size={14} className="ms-50" />
                        </Button>
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="d-flex justify-content-between mt-2 pt-1 border-top">
                      <Button color="secondary" outline size="sm" disabled={i === 0}
                        onClick={() => setActiveStep(i - 1)}>
                        <ArrowLeft size={14} className="me-50" />{t("Previous")}
                      </Button>
                      {i < totalSteps - 1 ? (
                        <Button color="primary" size="sm" onClick={() => setActiveStep(i + 1)}>
                          {t("Next")} <ArrowRight size={14} className="ms-50" />
                        </Button>
                      ) : allComplete ? (
                        <Button color="success" onClick={handleCompleteSetup} disabled={completing}>
                          {completing ? <Spinner size="sm" /> : <><CheckCircle size={14} className="me-50" />{t("Complete Setup")}</>}
                        </Button>
                      ) : (
                        <Button color="secondary" size="sm" disabled>{t("Complete all steps to finish")}</Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </Col>
        </Row>
      </div>
    </Fragment>
  )
}

export default CompanySetupPage
