// PCF Devtools - Main component adapted from TanStack Query DevTools
// Original: https://github.com/TanStack/query/blob/main/packages/query-devtools/src/DevtoolsComponent.tsx

import React from 'react'
import { PCFDevtoolsProvider, usePCFDevtools } from '../contexts/PCFDevtoolsContext'
import { PCFDevtoolsPanel } from './PCFDevtoolsPanel'
import { tokens, getThemeColors } from '../theme'

interface PCFDevtoolsToggleProps {
  onToggle: () => void
  isOpen: boolean
  theme: 'light' | 'dark'
}

const PCFDevtoolsToggle: React.FC<PCFDevtoolsToggleProps> = ({ onToggle, isOpen, theme }) => {
  const colors = getThemeColors(theme)
  
  const toggleStyles = {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: colors.active,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.font.size['7'],
    fontWeight: tokens.font.weight['2'],
    boxShadow: tokens.shadow['4'],
    zIndex: tokens.zIndices['4'],
    transition: 'all 0.2s ease',
  }
  
  return (
    <button
      style={toggleStyles}
      onClick={onToggle}
      title={isOpen ? 'Close PCF Devtools' : 'Open PCF Devtools'}
    >
      {isOpen ? '×' : '⚙'}
    </button>
  )
}

interface PCFDevtoolsInnerProps {
  showToggle?: boolean
  initialOpen?: boolean
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
}

const PCFDevtoolsInner: React.FC<PCFDevtoolsInnerProps> = ({
  showToggle = true,
  initialOpen = false,
  position = 'bottom-right',
}) => {
  const { isOpen, setIsOpen, theme } = usePCFDevtools()
  
  // Use system theme detection for the toggle when theme is 'system'
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  
  const getPositionStyles = () => {
    const baseSize = '400px'
    const offset = '20px'
    
    switch (position) {
      case 'bottom-left':
        return { bottom: offset, left: offset, right: 'auto', top: 'auto' }
      case 'bottom-right':
        return { bottom: offset, right: offset, left: 'auto', top: 'auto' }
      case 'top-left':
        return { top: offset, left: offset, right: 'auto', bottom: 'auto' }
      case 'top-right':
        return { top: offset, right: offset, left: 'auto', bottom: 'auto' }
      default:
        return { bottom: offset, right: offset, left: 'auto', top: 'auto' }
    }
  }
  
  return (
    <>
      {showToggle && (
        <PCFDevtoolsToggle
          onToggle={() => setIsOpen(!isOpen)}
          isOpen={isOpen}
          theme={effectiveTheme}
        />
      )}
      
      {isOpen && (
        <PCFDevtoolsPanel
          onClose={showToggle ? () => setIsOpen(false) : undefined}
          style={getPositionStyles()}
        />
      )}
    </>
  )
}

export interface PCFDevtoolsProps {
  /**
   * Set this true if you want the dev tools to default to being open
   */
  initialIsOpen?: boolean
  
  /**
   * Use this to render the devtools in a different position
   */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  
  /**
   * Set this true if you do not want the toggle button to show
   */
  toggleButtonProps?: boolean | { style?: React.CSSProperties; className?: string }
  
  /**
   * The initial theme for the devtools. Defaults to 'system'
   */
  initialTheme?: 'light' | 'dark' | 'system'
  
  /**
   * Context to monitor for changes
   */
  context?: ComponentFramework.Context<any>
  
  /**
   * Children to render inside the devtools provider
   */
  children?: React.ReactNode
}

export const PCFDevtools: React.FC<PCFDevtoolsProps> = ({
  initialIsOpen = false,
  position = 'bottom-right',
  toggleButtonProps = true,
  initialTheme = 'system',
  context,
  children,
}) => {
  const showToggle = toggleButtonProps !== false
  
  return (
    <PCFDevtoolsProvider
      initialOpen={initialIsOpen}
      initialTheme={initialTheme}
    >
      <PCFContextMonitor context={context} />
      {children}
      <PCFDevtoolsInner
        showToggle={showToggle}
        initialOpen={initialIsOpen}
        position={position}
      />
    </PCFDevtoolsProvider>
  )
}

// Component to monitor PCF context changes
interface PCFContextMonitorProps {
  context?: ComponentFramework.Context<any>
}

const PCFContextMonitor: React.FC<PCFContextMonitorProps> = ({ context }) => {
  const { setCurrentContext, addContextUpdate } = usePCFDevtools()
  const prevContextRef = React.useRef<ComponentFramework.Context<any> | undefined>(undefined)
  
  React.useEffect(() => {
    if (context) {
      setCurrentContext(context)
      
      // Track context changes
      if (prevContextRef.current && prevContextRef.current !== context) {
        addContextUpdate({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          property: 'context',
          oldValue: prevContextRef.current,
          newValue: context,
        })
      }
      
      prevContextRef.current = context
    }
  }, [context, setCurrentContext, addContextUpdate])
  
  return null
}

// Panel-only version for embedding without toggle
export const PCFDevtoolsPanel_Embedded: React.FC<{
  context?: ComponentFramework.Context<any>
  initialTheme?: 'light' | 'dark' | 'system'
}> = ({ context, initialTheme = 'system' }) => {
  return (
    <PCFDevtoolsProvider initialOpen={true} initialTheme={initialTheme}>
      <PCFContextMonitor context={context} />
      <PCFDevtoolsPanel />
    </PCFDevtoolsProvider>
  )
}