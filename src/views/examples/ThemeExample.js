// ** React Imports
import { Fragment } from 'react'

// ** Custom Hook
import { useCustomTheme } from '@utility/hooks/useCustomTheme'

// ** Reactstrap Imports
import { Card, CardBody, CardHeader, CardTitle, Button, Row, Col, Badge } from 'reactstrap'

const ThemeExample = () => {
  const { theme, switchTheme, updateThemeColors, resetTheme, getAvailableThemes } = useCustomTheme()

  const availableThemes = getAvailableThemes()

  return (
    <Fragment>
      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">Current Theme: {theme.name}</CardTitle>
            </CardHeader>
            <CardBody>
              <h5>Theme Colors</h5>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {Object.entries(theme.colors).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: color,
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    />
                    <Badge color="light-primary">{name}</Badge>
                    <div>
                      <small>{color}</small>
                    </div>
                  </div>
                ))}
              </div>

              <h5 className="mt-4">Custom Colors</h5>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {theme.customColors && Object.entries(theme.customColors).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: color,
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    />
                    <Badge color="light-secondary">{name}</Badge>
                    <div>
                      <small>{color}</small>
                    </div>
                  </div>
                ))}
              </div>

              <h5 className="mt-4">Theme Controls</h5>
              <div className="d-flex flex-wrap gap-2">
                {availableThemes.map(themeName => (
                  <Button
                    key={themeName}
                    color="primary"
                    outline
                    onClick={() => switchTheme(themeName)}
                  >
                    Switch to {themeName}
                  </Button>
                ))}
                <Button color="warning" outline onClick={resetTheme}>
                  Reset to Default
                </Button>
              </div>

              <h5 className="mt-4">Dynamic Color Update Example</h5>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  color="success"
                  onClick={() => updateThemeColors({ primary: '#ff0000' })}
                >
                  Set Primary to Red
                </Button>
                <Button
                  color="info"
                  onClick={() => updateThemeColors({ primary: '#0000ff' })}
                >
                  Set Primary to Blue
                </Button>
                <Button
                  color="secondary"
                  onClick={() => updateThemeColors({ primary: theme.colors.primary })}
                >
                  Restore Primary Color
                </Button>
              </div>

              <h5 className="mt-4">Typography</h5>
              <p>
                <strong>Font Family:</strong> {theme.typography?.fontFamily || 'Not set'}
              </p>
              <p>
                <strong>Base Font Size:</strong> {theme.typography?.fontSize?.base || 'Not set'}
              </p>

              <h5 className="mt-4">Branding</h5>
              <p>
                <strong>Logo:</strong> {theme.branding?.logo || 'Not set'}
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">Using CSS Variables</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="demo-inline-spacing">
                <Button style={{ backgroundColor: 'var(--bs-primary)', color: 'white', border: 'none' }}>
                  Primary Button (CSS Var)
                </Button>
                <Button style={{ backgroundColor: 'var(--bs-success)', color: 'white', border: 'none' }}>
                  Success Button (CSS Var)
                </Button>
                <Button style={{ backgroundColor: 'var(--custom-accent)', color: 'white', border: 'none' }}>
                  Custom Accent (CSS Var)
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Fragment>
  )
}

export default ThemeExample
