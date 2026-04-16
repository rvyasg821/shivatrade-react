// ** React Imports
import { Link, useLocation } from 'react-router-dom'

// ** Reactstrap Imports
import { Button, Card, CardBody } from 'reactstrap'

// ** Custom Hooks
import { useSkin } from '@hooks/useSkin'

// ** Utils
import { getUserData, getHomeRouteForLoggedInUser } from '@utils'

// ** Constants
import { appBaseName } from '@constant/defaultValues'

// ** Images
import notAuthorizedLight from '@src/assets/images/pages/not-authorized.svg'
import notAuthorizedDark from '@src/assets/images/pages/not-authorized-dark.svg'
import logoImage from "@src/assets/images/icons/small-logo.png"

// ** Styles
import '@styles/base/pages/page-misc.scss'

const NotAuthorized = () => {
  // ** Hooks
  const { skin } = useSkin()
  const location = useLocation()

  // ** Vars
  const user = getUserData()
  const { requiredPermission } = location.state || {}
  const source = skin === 'dark' ? notAuthorizedDark : notAuthorizedLight

  return (
    <div className='misc-wrapper'>
      {/* Brand Logo */}
      <Link className='brand-logo d-flex align-items-center' to='/'>
        <img src={logoImage} alt={appBaseName} height='40' className='me-1' />
        <h2 className='brand-text text-primary mb-0' style={{ fontWeight: 700 }}>{appBaseName}</h2>
      </Link>

      <div className='misc-inner p-2 p-sm-3'>
        <div className='w-100 text-center'>
          <Card className='shadow-sm border-0 mb-2' style={{ maxWidth: 500, margin: '0 auto' }}>
            <CardBody className='py-3 px-3'>
              <div className='mb-2'>
                <div className='rounded-circle d-inline-flex align-items-center justify-content-center mb-1'
                  style={{ width: 64, height: 64, backgroundColor: '#fff3e0' }}>
                  <span style={{ fontSize: '2rem' }}>🔐</span>
                </div>
              </div>
              <h2 className='mb-1 fw-bolder'>Not Authorized</h2>
              <p className='mb-2 text-muted'>
                {requiredPermission
                  ? `You need "${requiredPermission.description}" permission to access this page.`
                  : 'You do not have permission to access this page. Please contact your administrator if you believe this is an error.'
                }
              </p>
              <Button
                tag={Link}
                color='primary'
                className='mb-1'
                to={user ? getHomeRouteForLoggedInUser(user) : '/'}
              >
                Back to Home
              </Button>
            </CardBody>
          </Card>
          <img className='img-fluid' src={source} alt='Not authorized' style={{ maxWidth: 400 }} />
        </div>
      </div>
    </div>
  )
}

export default NotAuthorized
