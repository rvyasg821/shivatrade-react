// ** React Imports
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// ** Store Actions
import { getAuthMe } from './store';

// ** Utils
import {
    setAccessToken,
    setRefreshToken,
} from '@utils';

// ** Spinner Component
import Spinner from '@components/spinner/Loading-spinner';

const CrossLoginHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleCrossLogin = async () => {
            try {
                // Get tokens from URL
                const accessToken = searchParams.get('access_token');
                const refreshToken = searchParams.get('refresh_token');
                const isCrossLogin = searchParams.get('cross_login');
                const action = searchParams.get('action');

                if (!accessToken || !refreshToken || isCrossLogin !== 'true') {
                    setError('Invalid cross-login parameters');
                    setLoading(false);
                    return;
                }

                // Store tokens
                await setAccessToken(accessToken);
                await setRefreshToken(refreshToken);

                // Fetch user profile using the stored token
                const result = await dispatch(getAuthMe()).unwrap();

                if (result.actionFlag === 'AUTH_ME_SCS' && result.authUserItem) {
                    // Determine redirect path based on action
                    let redirectPath = '/apps/profile';
                    switch (action) {
                        case 'upgrade_plan':
                        case 'repurchase_plan':
                            redirectPath = '/apps/profile/subscription/upgrade';
                            break;
                        case 'view_subscription':
                        case 'edit_subscription':
                        case 'cancel_subscription':
                        case 'manage_billing':
                        default:
                            redirectPath = '/apps/profile';
                            break;
                    }

                    // Clear URL parameters and redirect
                    navigate(redirectPath, { replace: true });
                } else {
                    throw new Error(result.error || 'Failed to fetch user profile');
                }
            } catch (err) {
                console.error('Cross-login error:', err);
                setError(err.message || 'Cross-login failed. Please try again.');
                setLoading(false);

                // Clear any partial data
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userData');
            }
        };

        handleCrossLogin();
    }, [searchParams, navigate, dispatch]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <Spinner />
                    <p className="mt-2">Authenticating...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <h4 className="text-danger">Authentication Failed</h4>
                    <p>{error}</p>
                    <button
                        className="btn btn-primary mt-2"
                        onClick={() => navigate('/login', { replace: true })}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default CrossLoginHandler;
