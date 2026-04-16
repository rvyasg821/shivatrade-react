import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
    const sizeClasses = {
        small: 'spinner-small',
        medium: 'spinner-medium',
        large: 'spinner-large'
    };

    return (
        <div className="loading-container">
            <div className={`loading-spinner ${sizeClasses[size]}`}>
                <div className="spinner"></div>
            </div>
            {message && (
                <div className="loading-message">
                    {message}
                </div>
            )}
        </div>
    );
};

export default LoadingSpinner;