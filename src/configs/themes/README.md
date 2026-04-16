# Theme Configuration Guide

This directory contains JSON-based theme configuration files for the application. You can customize the application's colors, typography, and branding without modifying any code.

## 📁 File Structure

```
src/configs/themes/
├── default-theme.json          # Default application theme
├── custom-theme.json           # Your custom theme (EDIT THIS)
└── README.md                   # This file
```

## 🎨 How to Customize Your Theme

### Step 1: Edit the Theme JSON File

Open `custom-theme.json` and modify the colors to match your brand:

```json
{
  "name": "Custom Theme",
  "version": "1.0.0",
  "colors": {
    "primary": "#dd6d03",      // Primary brand color
    "secondary": "#82868b",    // Secondary color
    "success": "#09d66e",      // Success messages
    "danger": "#ea5455",       // Error messages
    "warning": "#ff9f43",      // Warning messages
    "info": "#00cfe8",         // Info messages
    "light": "#f6f6f6",        // Light backgrounds
    "dark": "#103033"          // Dark backgrounds
  },
  "customColors": {
    "accent": "#e06f03",               // Custom accent color
    "accentHover": "#f07d13",          // Accent hover state
    "darkPanel": "#2D5459",            // Dark panel background
    "darkPanelAlt": "#3c3c3c",         // Alternative dark panel
    "darkPanelLight": "#4a4a4a",       // Lighter dark panel
    "successGreen": "#09d66e",         // Success green variant
    "blackBg": "#000000",              // Pure black background
    "whiteText": "#ffffff"             // White text color
  }
}
```

### Step 2: Replace Logo Files

Place your logo files in: `src/assets/images/logo/`

Required logo files:
- `logo.png` - Main logo (used in light mode)
- `logo-light.png` - Logo for dark backgrounds
- `logo-dark.png` - Logo for light backgrounds
- `favicon.ico` - Browser favicon

Update the branding section in your theme JSON:

```json
{
  "branding": {
    "logo": "logo.png",
    "logoLight": "logo-light.png",
    "logoDark": "logo-dark.png",
    "favicon": "favicon.ico"
  }
}
```

### Step 3: Customize Typography (Optional)

Modify font family and sizes:

```json
{
  "typography": {
    "fontFamily": "Montserrat, Helvetica, Arial, serif",
    "fontSize": {
      "base": "1rem",
      "small": "0.857rem",
      "large": "1.143rem",
      "h1": "2rem",
      "h2": "1.714rem",
      "h3": "1.5rem",
      "h4": "1.286rem",
      "h5": "1.07rem",
      "h6": "1rem"
    }
  }
}
```

### Step 4: Save and Restart

After making changes:
1. Save the JSON file
2. Restart your development server (`npm start`)
3. Your theme will be automatically applied!

## 🔧 Using Theme in Components

### Method 1: Using the Custom Hook (Recommended)

```javascript
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const MyComponent = () => {
  const { theme } = useCustomTheme()

  return (
    <div style={{ color: theme.colors.primary }}>
      <h1>{theme.name}</h1>
      <p>Primary Color: {theme.colors.primary}</p>
    </div>
  )
}
```

### Method 2: Using CSS Custom Properties

The theme automatically creates CSS variables that you can use in your SCSS/CSS files:

```scss
.my-button {
  background-color: var(--bs-primary);
  color: var(--bs-light);

  &:hover {
    background-color: var(--custom-accent);
  }
}
```

Available CSS variables:
- `--bs-primary`, `--bs-secondary`, `--bs-success`, etc. (Bootstrap colors)
- `--primary`, `--secondary`, `--success`, etc. (Generic colors)
- `--custom-accent`, `--custom-darkPanel`, etc. (Custom colors)
- `--font-family` (Typography)
- `--font-size-base`, `--font-size-small`, etc. (Font sizes)

### Method 3: Using Theme in Styled Components

```javascript
import styled from 'styled-components'
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const StyledButton = styled.button`
  background-color: ${props => props.primaryColor};
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
`

const MyComponent = () => {
  const { theme } = useCustomTheme()

  return (
    <StyledButton primaryColor={theme.colors.primary}>
      Click Me
    </StyledButton>
  )
}
```

## 🎯 Advanced Usage

### Switching Between Themes Programmatically

```javascript
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const ThemeSwitcher = () => {
  const { switchTheme, getAvailableThemes } = useCustomTheme()

  return (
    <div>
      <button onClick={() => switchTheme('default')}>
        Default Theme
      </button>
      <button onClick={() => switchTheme('custom')}>
        Custom Theme
      </button>
    </div>
  )
}
```

### Updating Colors Dynamically

```javascript
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const ColorCustomizer = () => {
  const { updateThemeColors } = useCustomTheme()

  const changePrimaryColor = () => {
    updateThemeColors({
      primary: '#ff0000',
      secondary: '#00ff00'
    })
  }

  return (
    <button onClick={changePrimaryColor}>
      Change Colors
    </button>
  )
}
```

### Loading a Custom Theme Object

```javascript
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const ThemeLoader = () => {
  const { loadTheme } = useCustomTheme()

  const loadMyTheme = () => {
    const myCustomTheme = {
      name: "My Dynamic Theme",
      colors: {
        primary: "#123456",
        secondary: "#654321"
        // ... other colors
      },
      customColors: {
        accent: "#abcdef"
      }
    }

    loadTheme(myCustomTheme)
  }

  return <button onClick={loadMyTheme}>Load Theme</button>
}
```

### Resetting to Default Theme

```javascript
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

const ResetButton = () => {
  const { resetTheme } = useCustomTheme()

  return (
    <button onClick={resetTheme}>
      Reset to Default Theme
    </button>
  )
}
```

## 📋 Theme JSON Schema

### Required Fields

```json
{
  "name": "string",              // Theme name (required)
  "version": "string",           // Version number (recommended)
  "colors": {                    // Bootstrap-compatible colors (required)
    "primary": "string",         // Hex color code
    "secondary": "string",
    "success": "string",
    "danger": "string",
    "warning": "string",
    "info": "string",
    "light": "string",
    "dark": "string"
  }
}
```

### Optional Fields

```json
{
  "customColors": {              // Your custom color variables (optional)
    "accent": "string",
    "customColor1": "string"
    // ... add as many as you need
  },
  "typography": {                // Typography settings (optional)
    "fontFamily": "string",
    "fontSize": {
      "base": "string",
      "small": "string"
      // ... more sizes
    }
  },
  "branding": {                  // Branding assets (optional)
    "logo": "string",
    "logoLight": "string",
    "logoDark": "string",
    "favicon": "string"
  },
  "layout": {                    // Layout preferences (optional)
    "type": "vertical|horizontal",
    "contentWidth": "boxed|full",
    "navbarType": "floating|static|sticky|hidden"
  }
}
```

## 🎨 Color Palette Best Practices

1. **Primary Color**: Your main brand color (used for buttons, links, highlights)
2. **Secondary Color**: Complementary color (used for less prominent elements)
3. **Success Color**: Green tones (used for success messages, confirmations)
4. **Danger Color**: Red tones (used for errors, warnings, destructive actions)
5. **Warning Color**: Orange/yellow tones (used for warnings, alerts)
6. **Info Color**: Blue tones (used for informational messages)
7. **Light Color**: Light background color
8. **Dark Color**: Dark text/background color

### Recommended Tools for Color Selection

- [Adobe Color](https://color.adobe.com/)
- [Coolors](https://coolors.co/)
- [ColorHunt](https://colorhunt.co/)
- [Material Design Color Tool](https://material.io/resources/color/)

## 🐛 Troubleshooting

### Theme Not Applying

1. Clear your browser's localStorage: `localStorage.removeItem('app-custom-theme')`
2. Hard refresh the page: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. Check browser console for errors
4. Verify JSON syntax is valid (use a JSON validator)

### Colors Not Showing

1. Make sure CSS variable names are correct: `var(--bs-primary)` or `var(--primary)`
2. Check that the color is defined in the theme JSON
3. Ensure CustomThemeProvider is properly wrapped in index.js

### Logo Not Displaying

1. Verify the logo file exists in `src/assets/images/logo/`
2. Check the filename matches exactly in the theme JSON
3. Ensure the image format is supported (PNG, JPG, SVG)

## 📝 Notes

- Theme changes are automatically saved to browser's localStorage
- The theme persists across browser sessions
- You can have multiple theme JSON files and switch between them
- CSS custom properties work in all modern browsers
- For older browser support, consider using the SCSS fallback approach

## 🚀 Quick Start Checklist

- [ ] Edit `custom-theme.json` with your brand colors
- [ ] Replace logo files in `src/assets/images/logo/`
- [ ] Update branding section in theme JSON
- [ ] Save and restart development server
- [ ] Clear browser cache and refresh
- [ ] Verify theme is applied correctly

## 💡 Tips

1. **Use Consistent Colors**: Keep your color palette consistent across all themes
2. **Test Accessibility**: Ensure sufficient contrast ratios (use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/))
3. **Document Custom Colors**: Add comments in your theme JSON to explain custom colors
4. **Version Control**: Keep your theme JSON files in version control
5. **Backup**: Always keep a copy of your working theme before making major changes

---

For more help or questions, refer to the application documentation or contact the development team.
