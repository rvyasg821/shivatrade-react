// ** React Imports
import { useContext } from 'react'

// ** Context Import
import { CustomThemeContext } from '../context/CustomThemeProvider'

/**
 * Custom hook to access theme context
 *
 * @returns {Object} Theme context object containing:
 *   - theme: Current theme object
 *   - switchTheme: Function to switch between predefined themes
 *   - updateThemeColors: Function to update primary colors
 *   - updateCustomColors: Function to update custom colors
 *   - resetTheme: Function to reset to default theme
 *   - loadTheme: Function to load a custom theme object
 *   - getAvailableThemes: Function to get list of available themes
 *   - availableThemes: Object containing all available themes
 *
 * @example
 * // Basic usage in a component
 * import { useCustomTheme } from '@utility/hooks/useCustomTheme'
 *
 * const MyComponent = () => {
 *   const { theme, switchTheme } = useCustomTheme()
 *
 *   return (
 *     <div>
 *       <p>Current theme: {theme.name}</p>
 *       <button onClick={() => switchTheme('custom')}>
 *         Switch to Custom Theme
 *       </button>
 *     </div>
 *   )
 * }
 *
 * @example
 * // Accessing theme colors
 * const { theme } = useCustomTheme()
 * const primaryColor = theme.colors.primary
 * const accentColor = theme.customColors.accent
 *
 * @example
 * // Updating colors dynamically
 * const { updateThemeColors } = useCustomTheme()
 * updateThemeColors({ primary: '#ff0000', secondary: '#00ff00' })
 */
export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext)

  if (context === undefined) {
    throw new Error(
      'useCustomTheme must be used within a CustomThemeProvider. ' +
      'Make sure your component is wrapped with <CustomThemeProvider>.'
    )
  }

  return context
}

export default useCustomTheme
