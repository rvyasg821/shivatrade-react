// Performance optimization utilities for plan selection

// Debounce function for search/filter operations
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle function for scroll/resize events
export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Memoization for expensive calculations
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

// Optimized price calculation with memoization
export const calculatePlanPrice = memoize((tools, platformPrice) => {
    const toolsTotal = tools.reduce((sum, tool) => sum + (tool.price || 0), 0);
    const platformFee = platformPrice || 0;
    const totalPrice = toolsTotal + platformFee;

    return {
        toolsTotal,
        platformFee,
        totalPrice
    };
});

// Lazy loading utility for components
export const createLazyComponent = (importFunc) => {
    return React.lazy(() => {
        return importFunc().catch(error => {
            console.error('Failed to load component:', error);
            // Return a fallback component
            return {
                default: () => React.createElement('div', {
                    className: 'component-load-error'
                }, 'Failed to load component')
            };
        });
    });
};

// Image preloading for better UX
export const preloadImages = (imageUrls) => {
    return Promise.all(
        imageUrls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
                img.src = url;
            });
        })
    );
};

// Virtual scrolling helper for large lists
export const calculateVisibleItems = (scrollTop, itemHeight, containerHeight, totalItems) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        totalItems - 1
    );

    return {
        startIndex: Math.max(0, startIndex),
        endIndex,
        visibleItems: endIndex - startIndex + 1
    };
};

// Bundle size optimization - dynamic imports
export const loadFeatureModule = async (moduleName) => {
    try {
        switch (moduleName) {
            case 'planAnalytics':
                return await import('../features/planAnalytics');
            case 'planComparison':
                return await import('../features/planComparison');
            default:
                throw new Error(`Unknown module: ${moduleName}`);
        }
    } catch (error) {
        console.error(`Failed to load module ${moduleName}:`, error);
        return null;
    }
};

// Memory management for large datasets
export class DataManager {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

// Performance monitoring
export const performanceMonitor = {
    startTiming: (label) => {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(`${label}-start`);
        }
    },

    endTiming: (label) => {
        if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);

            const measure = performance.getEntriesByName(label)[0];
            if (measure) {
                console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
            }
        }
    },

    measureComponent: (WrappedComponent, componentName) => {
        return React.forwardRef((props, ref) => {
            React.useEffect(() => {
                performanceMonitor.startTiming(`${componentName}-render`);
                return () => {
                    performanceMonitor.endTiming(`${componentName}-render`);
                };
            });

            return React.createElement(WrappedComponent, { ...props, ref });
        });
    }
};

// Resource cleanup utilities
export const createCleanupManager = () => {
    const cleanupTasks = new Set();

    return {
        addCleanup: (task) => {
            cleanupTasks.add(task);
        },

        removeCleanup: (task) => {
            cleanupTasks.delete(task);
        },

        cleanup: () => {
            cleanupTasks.forEach(task => {
                try {
                    task();
                } catch (error) {
                    console.error('Cleanup task failed:', error);
                }
            });
            cleanupTasks.clear();
        }
    };
};