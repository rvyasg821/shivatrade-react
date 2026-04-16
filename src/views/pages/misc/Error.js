// ** React Imports
import { Link } from 'react-router-dom'

// ** Reactstrap Imports
import { Button, Card, CardBody } from 'reactstrap'

// ** Constants
import { appBaseName } from '@constant/defaultValues'

// ** Custom Hooks
import { useSkin } from '@hooks/useSkin'

// ** Images
import logoImage from '@src/assets/images/ico/sidebar-logo.png'

// ** Styles
import '@styles/base/pages/page-misc.scss'

const Error = () => {
  const { skin } = useSkin()

  const illustrationLight = require('@src/assets/images/pages/error.svg').default
  const illustrationDark = require('@src/assets/images/pages/error-dark.svg').default
  const illustration = skin === 'dark' ? illustrationDark : illustrationLight

  return (
    <div className='misc-wrapper'>
      <a className='brand-logo d-flex align-items-center' href='/'>
        <img src={logoImage} alt={appBaseName} height='40' className='me-1' />
        <h2 className='brand-text text-primary mb-0' style={{ fontWeight: 700 }}>{appBaseName}</h2>
      </a>
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
              <Button tag={Link} to='/' color='primary' className='mb-1'>
                Back to Home
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
