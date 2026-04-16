import { useNavigate } from 'react-router-dom'
import { Alert, Button } from 'reactstrap'
import { ArrowLeft } from 'react-feather'

const SetupReturnBanner = () => {
  const navigate = useNavigate()
  const returnUrl = localStorage.getItem('setupReturnUrl')
  if (!returnUrl) return null

  const handleReturn = () => {
    localStorage.removeItem('setupReturnUrl')
    navigate(returnUrl)
  }

  return (
    <Alert color="info" className="d-flex align-items-center justify-content-between py-50 mb-1">
      <span className="small">You're configuring settings as part of the setup wizard.</span>
      <Button color="info" size="sm" outline onClick={handleReturn}>
        <ArrowLeft size={14} className="me-50" />Back to Setup
      </Button>
    </Alert>
  )
}

export default SetupReturnBanner
