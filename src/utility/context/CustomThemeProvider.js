// ** React Imports
import { createContext, useEffect, useState } from 'react'

// ** Import Theme JSON Files
import defaultTheme from '@configs/themes/default-theme.json'
import customTheme from '@configs/themes/custom-theme.json'

// ** Create Context
export const CustomThemeContext = createContext()

// ** Available Themes
const AVAILABLE_THEMES = {
  default: defaultTheme,
  custom: customTheme
}

// ** Local Storage Key
const STORAGE_KEY = 'app-custom-theme'

// ** Custom Theme Provider Component
export const CustomThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      // Try to load theme from localStorage
      const savedTheme = localStorage.getItem(STORAGE_KEY)
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme)
        // Validate that the saved theme has required structure
        if (parsed.colors && parsed.name) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Error loading saved theme:', error)
    }
    // Default to custom theme if no saved theme or error
    return customTheme
  })

  // ** Apply Theme CSS Variables
  useEffect(() => {
    const root = document.documentElement

    // Apply primary color variables (Bootstrap compatible)
    if (currentTheme.colors) {
      Object.entries(currentTheme.colors).forEach(([key, value]) => {
        // Bootstrap CSS variables
        root.style.setProperty(`--bs-${key}`, value)
        // Generic CSS variables
        root.style.setProperty(`--${key}`, value)
      })
    }

    // Apply custom color variables
    if (currentTheme.customColors) {
      Object.entries(currentTheme.customColors).forEach(([key, value]) => {
        root.style.setProperty(`--custom-${key}`, value)
      })
    }

    // Apply typography variables
    if (currentTheme.typography) {
      if (currentTheme.typography.fontFamily) {
        root.style.setProperty('--font-family', currentTheme.typography.fontFamily)
      }

      if (currentTheme.typography.fontSize) {
        Object.entries(currentTheme.typography.fontSize).forEach(([key, value]) => {
          root.style.setProperty(`--font-size-${key}`, value)
        })
      }
    }

    // Save theme to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTheme))
    } catch (error) {
      console.error('Error saving theme to localStorage:', error)
    }

    // Log theme application (can be removed in production)
    // console.log(`✅ Theme applied: ${currentTheme.name}`, currentTheme)
  }, [currentTheme])

  // ** Switch Between Predefined Themes
  const switchTheme = (themeName) => {
    const theme = AVAILABLE_THEMES[themeName]
    if (theme) {
      setCurrentTheme(theme)
      console.log(`Switched to theme: ${themeName}`)
    } else {
      console.warn(`Theme "${themeName}" not found. Available themes:`, Object.keys(AVAILABLE_THEMES))
    }
  }

  // ** Update Individual Colors (for runtime customization)
  const updateThemeColors = (colorUpdates) => {
    setCurrentTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, ...colorUpdates }
    }))
  }

  // ** Update Custom Colors
  const updateCustomColors = (customColorUpdates) => {
    setCurrentTheme(prev => ({
      ...prev,
      customColors: { ...prev.customColors, ...customColorUpdates }
    }))
  }

  // ** Reset to Default Theme
  const resetTheme = () => {
    setCurrentTheme(defaultTheme)
    console.log('Theme reset to default')
  }

  // ** Load Theme from JSON Object (for dynamic theme loading)
  const loadTheme = (themeObject) => {
    if (themeObject && themeObject.colors && themeObject.name) {
      setCurrentTheme(themeObject)
      console.log(`Custom theme loaded: ${themeObject.name}`)
    } else {
      console.error('Invalid theme object. Must contain "name" and "colors" properties.')
    }
  }

  // ** Get Available Theme Names
  const getAvailableThemes = () => {
    return Object.keys(AVAILABLE_THEMES)
  }

  // ** Context Value
  const value = {
    theme: currentTheme,
    switchTheme,
    updateThemeColors,
    updateCustomColors,
    resetTheme,
    loadTheme,
    getAvailableThemes,
    availableThemes: AVAILABLE_THEMES
  }

  return (
    <CustomThemeContext.Provider value={value}>
      {children}
    </CustomThemeContext.Provider>
  )
}

export default CustomThemeProvider
