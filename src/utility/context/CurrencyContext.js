// ** React Imports
import { createContext, useContext, useEffect, useState } from 'react'
import instance from '../../utility/AxiosConfig'

// Default currency config
const DEFAULT_CURRENCY = {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
}

// Currency symbol mapping (fallback)
const CURRENCY_SYMBOLS = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    NZD: 'NZ$',
    SGD: 'S$',
    HKD: 'HK$',
    KRW: '₩',
    MXN: 'MX$',
    BRL: 'R$',
    ZAR: 'R',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    THB: '฿',
    MYR: 'RM',
    PHP: '₱',
    IDR: 'Rp',
    AED: 'د.إ',
    SAR: '﷼',
}

// ** Create Context
const CurrencyContext = createContext({
    currency: DEFAULT_CURRENCY,
    loading: true,
    formatPrice: (amount) => `$${Number(amount).toFixed(2)}`,
    formatPriceWithCode: (amount) => `USD ${Number(amount).toFixed(2)}`,
    getCurrencySymbol: () => '$'
})

// ** Custom Hook
export const useCurrency = () => {
    const context = useContext(CurrencyContext)
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider')
    }
    return context
}

// ** Provider Component
export const CurrencyProvider = ({ children }) => {
    // Try to get initial state from localStorage
    const getInitialCurrency = () => {
        try {
            const storedSymbol = localStorage.getItem('currencySymbol')
            const storedCode = localStorage.getItem('currencyCode')
            const storedName = localStorage.getItem('currencyName')
            if (storedSymbol && storedCode) {
                return {
                    code: storedCode,
                    symbol: storedSymbol,
                    name: storedName || storedCode
                }
            }
        } catch (e) {
            console.warn('Could not read currency from localStorage')
        }
        return DEFAULT_CURRENCY
    }

    const [currency, setCurrency] = useState(getInitialCurrency)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCurrencyConfig = async () => {
            try {
                const response = await instance.get('/public/setting/currency')
                if (response?.data?.data) {
                    const newCurrency = {
                        code: response.data.data.code || DEFAULT_CURRENCY.code,
                        symbol: response.data.data.symbol || DEFAULT_CURRENCY.symbol,
                        name: response.data.data.name || DEFAULT_CURRENCY.name
                    }
                    setCurrency(newCurrency)
                    // Store in localStorage for utility functions that can't use hooks
                    localStorage.setItem('currencySymbol', newCurrency.symbol)
                    localStorage.setItem('currencyCode', newCurrency.code)
                    localStorage.setItem('currencyName', newCurrency.name)
                }
            } catch (error) {
                console.warn('Failed to fetch currency config, using default:', error.message)
                // Store defaults in localStorage
                localStorage.setItem('currencySymbol', DEFAULT_CURRENCY.symbol)
                localStorage.setItem('currencyCode', DEFAULT_CURRENCY.code)
                localStorage.setItem('currencyName', DEFAULT_CURRENCY.name)
            } finally {
                setLoading(false)
            }
        }

        fetchCurrencyConfig()
    }, [])

    // Format price with currency symbol
    const formatPrice = (amount) => {
        const numAmount = Number(amount)
        if (isNaN(numAmount)) {
            return `${currency.symbol}0.00`
        }
        return `${currency.symbol}${numAmount.toFixed(2)}`
    }

    // Format price with currency code (e.g., "USD 100.00")
    const formatPriceWithCode = (amount) => {
        const numAmount = Number(amount)
        if (isNaN(numAmount)) {
            return `${currency.code} 0.00`
        }
        return `${currency.code} ${numAmount.toFixed(2)}`
    }

    // Get current currency symbol
    const getCurrencySymbol = () => currency.symbol

    // Get currency code
    const getCurrencyCode = () => currency.code

    // Get symbol by code (for manual lookups)
    const getSymbolByCode = (code) => CURRENCY_SYMBOLS[code?.toUpperCase()] || code

    const value = {
        currency,
        loading,
        formatPrice,
        formatPriceWithCode,
        getCurrencySymbol,
        getCurrencyCode,
        getSymbolByCode
    }

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    )
}

export { CurrencyContext }
export default CurrencyProvider
