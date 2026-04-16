// ** React Imports
import { useSelector } from 'react-redux'

// ** Debug component to inspect auth state structure
const AuthDebug = () => {
  const authStore = useSelector((state) => state.auth)
  
  return (
    <div style={{ 
      background: '#f8f9fa', 
      padding: '10px', 
      margin: '10px 0', 
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <strong>Auth State Debug:</strong>
      <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(authStore, null, 2)}
      </pre>
    </div>
  )
}

export default AuthDebug