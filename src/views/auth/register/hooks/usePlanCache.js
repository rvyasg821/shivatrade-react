import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'plan_selection_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePlanCache = () => {
    const [cache, setCache] = useState(new Map());

    // Load cache from localStorage on mount
    useEffect(() => {
        try {
            const savedCache = localStorage.getItem(CACHE_KEY);
            if (savedCache) {
                const parsedCache = JSON.parse(savedCache);
                const cacheMap = new Map();

                Object.entries(parsedCache).forEach(([key, value]) => {
                    // Check if cache entry is still valid
                    if (Date.now() - value.timestamp < CACHE_DURATION) {
                        cacheMap.set(key, value);
                    }
                });

                setCache(cacheMap);
            }
        } catch (error) {
            console.warn('Failed to load plan cache from localStorage:', error);
        }
    }, []);

    // Save cache to localStorage when it changes
    useEffect(() => {
        try {
            const cacheObject = {};
            cache.forEach((value, key) => {
                cacheObject[key] = value;
            });
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
        } catch (error) {
            console.warn('Failed to save plan cache to localStorage:', error);
        }
    }, [cache]);

    const getCachedPlans = useCallback((durationType) => {
        const key = `plans_${durationType || 'all'}`;
        const cachedEntry = cache.get(key);

        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
            return cachedEntry.data;
        }

        return null;
    }, [cache]);

    const setCachedPlans = useCallback((durationType, plans) => {
        const key = `plans_${durationType || 'all'}`;
        const cacheEntry = {
            data: plans,
            timestamp: Date.now()
        };

        setCache(prevCache => {
            const newCache = new Map(prevCache);
            newCache.set(key, cacheEntry);
            return newCache;
        });
    }, []);

    const clearCache = useCallback(() => {
        setCache(new Map());
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (error) {
            console.warn('Failed to clear plan cache from localStorage:', error);
        }
    }, []);

    const isCacheValid = useCallback((durationType) => {
        const key = `plans_${durationType || 'all'}`;
        const cachedEntry = cache.get(key);

        return cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION;
    }, [cache]);

    return {
        getCachedPlans,
        setCachedPlans,
        clearCache,
        isCacheValid
    };
};