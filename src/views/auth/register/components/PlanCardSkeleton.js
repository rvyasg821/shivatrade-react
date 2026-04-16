import React from 'react';

const PlanCardSkeleton = () => {
    return (
        <div className="plan-card skeleton">
            <div className="skeleton-header">
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-description"></div>
            </div>

            <div className="skeleton-pricing">
                <div className="skeleton-line skeleton-price"></div>
                <div className="skeleton-line skeleton-period"></div>
            </div>

            <div className="skeleton-tools">
                <div className="skeleton-line skeleton-tools-title"></div>
                <div className="skeleton-tool-item">
                    <div className="skeleton-circle"></div>
                    <div className="skeleton-line skeleton-tool-name"></div>
                    <div className="skeleton-line skeleton-tool-price"></div>
                </div>
                <div className="skeleton-tool-item">
                    <div className="skeleton-circle"></div>
                    <div className="skeleton-line skeleton-tool-name"></div>
                    <div className="skeleton-line skeleton-tool-price"></div>
                </div>
                <div className="skeleton-tool-item">
                    <div className="skeleton-circle"></div>
                    <div className="skeleton-line skeleton-tool-name"></div>
                    <div className="skeleton-line skeleton-tool-price"></div>
                </div>
            </div>

            <div className="skeleton-features">
                <div className="skeleton-line skeleton-features-title"></div>
                <div className="skeleton-feature-item">
                    <div className="skeleton-circle"></div>
                    <div className="skeleton-line skeleton-feature-text"></div>
                </div>
                <div className="skeleton-feature-item">
                    <div className="skeleton-circle"></div>
                    <div className="skeleton-line skeleton-feature-text"></div>
                </div>
            </div>
        </div>
    );
};

const PlanCardSkeletonGrid = ({ count = 3 }) => {
    return (
        <div className="plan-cards-container">
            {Array.from({ length: count }, (_, index) => (
                <PlanCardSkeleton key={index} />
            ))}
        </div>
    );
};

export default PlanCardSkeleton;
export { PlanCardSkeletonGrid };