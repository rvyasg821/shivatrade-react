// ** React Imports
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// ** Reactstrap Imports
import { Button, Card, CardBody, Spinner } from 'reactstrap'

// ** Constants
import { appBaseName } from '@constant/defaultValues'

// ** Store / Utils
import { handleLogout, getCompanyData } from '@src/redux/authentication'
import { getCurrentUser, getHomeRoute } from '@src/utility/Utils'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// ** Custom Hooks
import { useSkin } from '@hooks/useSkin'

// ** Images
import logoImage from '@src/assets/images/ico/sidebar-logo.png'

// ** Styles
import '@styles/base/pages/page-misc.scss'

const Error = () => {
  const { skin } = useSkin()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [checking, setChecking] = useState(false)

  const illustrationLight = require('@src/assets/images/pages/error.svg').default
  const illustrationDark = require('@src/assets/images/pages/error-dark.svg').default
  const illustration = skin === 'dark' ? illustrationDark : illustrationLight

  // Validate the stored session before going home. A stale/expired token would
  // otherwise bounce the user straight back to this page. If the session is
  // still good → go to the role's home (dashboard); if not → clear it and
  // send them to login so they can re-authenticate cleanly.
  const onBackHome = async () => {
    const token = localStorage.getItem('accessToken')
    const user = getCurrentUser()
    if (!token || !user?._id) {
      dispatch(handleLogout())
      navigate('/login', { replace: true })
      return
    }
    try {
      setChecking(true)
      // Authenticated probe — AxiosConfig attaches the token and this 401s on
      // an invalid/expired session.
      await instance.get(API_ENDPOINTS.auth.me)
      const home = getHomeRoute(user, getCompanyData())
      navigate(home, { replace: true })
    } catch (err) {
      // Session invalid/expired → force a clean logout.
      dispatch(handleLogout())
      navigate('/login', { replace: true })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className='misc-wrapper'>
      <span className='brand-logo d-flex align-items-center'>
        <img src={logoImage} alt={appBaseName} height='40' className='me-1' />
        <h2 className='brand-text text-primary mb-0' style={{ fontWeight: 700 }}>{appBaseName}</h2>
      </span>
      <div className='misc-inner p-2 p-sm-3'>
        <div className='w-100 text-center'>
          <Card className='shadow-sm border-0 mb-2' style={{ maxWidth: 500, margin: '0 auto' }}>
            <CardBody className='py-3 px-3'>
              <div className='mb-2'>
                <div className='rounded-circle d-inline-flex align-items-center justify-content-center mb-1'
                  style={{ width: 64, height: 64, backgroundColor: '#fce4ec' }}>
                  <span style={{ fontSize: '2rem' }}>🕵️</span>
                </div>
              </div>
              <h2 className='mb-1 fw-bolder'>Page Not Found</h2>
              <p className='mb-2 text-muted'>
                The requested page was not found. It may have been moved or deleted.
              </p>
              <Button color='primary' className='mb-1' onClick={onBackHome} disabled={checking}>
                {checking ? (
                  <>
                    <Spinner size='sm' className='me-50' /> Checking session…
                  </>
                ) : (
                  'Back to Home'
                )}
              </Button>
            </CardBody>
          </Card>
          <img className='img-fluid' src={illustration} alt='Page not found' style={{ maxWidth: 400 }} />
        </div>
      </div>
    </div>
  )
}

export default Error
