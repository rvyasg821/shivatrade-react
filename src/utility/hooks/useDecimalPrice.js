import { useCallback } from "react"

/**
 * useDecimalPrice - Hook that returns a formatter function for prices
 * @param {number} fixed - How many decimal places to keep (default = 2)
 */
const useDecimalPrice = (fixed = 2) => {
  const toDecimal = useCallback((value) => {
    const number = Number(value)
    return isNaN(number) ? "0.00" : number.toFixed(fixed)
  }, [fixed])

  return toDecimal
}

export default useDecimalPrice
