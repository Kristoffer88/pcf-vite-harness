// PCF Devtools Panel - Adapted from TanStack Query DevTools DevtoolsPanelComponent.tsx
// Original: https://github.com/TanStack/query/blob/main/packages/query-devtools/src/DevtoolsPanelComponent.tsx

import React, { useState } from 'react'
import { usePCFDevtools, useSystemTheme } from '../contexts/PCFDevtoolsContext'
import { Explorer } from './Explorer'
import { tokens, getThemeColors } from '../theme'
import { formatDuration, formatTimestamp, getWebApiStatusColor, getWebApiStatusLabel, sortWebApiRequests } from '../utils'
import type { PCFDevtoolsTab } from '../constants'

interface PCFDevtoolsPanelProps {
  onClose?: () => void
  className?: string
  style?: React.CSSProperties
}

export const PCFDevtoolsPanel: React.FC<PCFDevtoolsPanelProps> = ({
  onClose,
  className,
  style,
}) => {
  const {
    activeTab,
    setActiveTab,
    theme,
    setTheme,
    webApiRequests,
    contextUpdates,
    currentContext,
    clearWebApiRequests,
    clearContextUpdates,
    triggerInit,
    triggerUpdate,
    triggerDestroyInit,
  } = usePCFDevtools()
  
  const systemTheme = useSystemTheme()
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const colors = getThemeColors(effectiveTheme)
  
  const [sortBy, setSortBy] = useState('Status > Last Updated')
  const sortedRequests = sortWebApiRequests(webApiRequests, sortBy)
  
  const panelStyles = {
    container: {
      position: 'fixed' as const,
      bottom: 0,
      right: 0,
      width: '600px',
      height: '400px',
      backgroundColor: colors.background,
      color: colors.foreground,
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: `${tokens.border.radius['3']} ${tokens.border.radius['3']} 0 0`,
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: tokens.font.family.sans,
      fontSize: tokens.font.size['4'],
      boxShadow: tokens.shadow['5'],
      zIndex: tokens.zIndices['5'],
      ...style,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: tokens.size['3'],
      borderBottom: `1px solid ${colors.inputBorder}`,
      backgroundColor: colors.backgroundAlt,
    },
    title: {
      fontWeight: tokens.font.weight['2'],
      fontSize: tokens.font.size['5'],
      margin: 0,
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.size['2'],
    },
    themeSelect: {
      padding: `${tokens.size['1']} ${tokens.size['2']}`,
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: tokens.border.radius['2'],
      backgroundColor: colors.inputBackground,
      color: colors.foreground,
      fontSize: tokens.font.size['3'],
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: tokens.font.size['6'],
      cursor: 'pointer',
      color: colors.gray,
      padding: tokens.size['1'],
    },
    tabsContainer: {
      display: 'flex',
      borderBottom: `1px solid ${colors.inputBorder}`,
    },
    tab: {
      padding: `${tokens.size['2']} ${tokens.size['4']}`,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: tokens.font.size['4'],
      fontWeight: tokens.font.weight['1'],
      color: colors.gray,
      borderBottom: '2px solid transparent',
    },
    activeTab: {
      color: colors.active,
      borderBottomColor: colors.active,
      fontWeight: tokens.font.weight['2'],
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: tokens.size['3'],
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: tokens.size['3'],
      padding: tokens.size['2'],
      backgroundColor: colors.backgroundAlt,
      borderRadius: tokens.border.radius['2'],
    },
    sortSelect: {
      padding: `${tokens.size['1']} ${tokens.size['2']}`,
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: tokens.border.radius['2'],
      backgroundColor: colors.inputBackground,
      color: colors.foreground,
      fontSize: tokens.font.size['3'],
    },
    clearButton: {
      padding: `${tokens.size['2']} ${tokens.size['3']}`,
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: tokens.border.radius['2'],
      backgroundColor: colors.inputBackground,
      color: colors.foreground,
      fontSize: tokens.font.size['3'],
      cursor: 'pointer',
    },
    requestItem: {
      padding: tokens.size['3'],
      marginBottom: tokens.size['2'],
      border: `1px solid ${colors.inputBorder}`,
      borderRadius: tokens.border.radius['2'],
      backgroundColor: colors.backgroundAlt,
    },
    requestHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: tokens.size['2'],
    },
    requestMethod: {
      fontWeight: tokens.font.weight['2'],
      fontFamily: tokens.font.family.mono,
      fontSize: tokens.font.size['3'],
    },
    requestUrl: {
      fontFamily: tokens.font.family.mono,
      fontSize: tokens.font.size['3'],
      color: colors.gray,
    },
    statusBadge: {
      padding: `${tokens.size['1']} ${tokens.size['2']}`,
      borderRadius: tokens.border.radius['2'],
      fontSize: tokens.font.size['2'],
      fontWeight: tokens.font.weight['2'],
      color: 'white',
    },
    requestDetails: {
      fontSize: tokens.font.size['3'],
      color: colors.grayAlt,
      fontFamily: tokens.font.family.mono,
    },
    emptyState: {
      textAlign: 'center' as const,
      color: colors.gray,
      padding: tokens.size['6'],
      fontStyle: 'italic',
    },
  }
  
  const tabs = [
    { id: 'lifecycle', label: 'Lifecycle' },
    { id: 'webapi', label: 'WebAPI' },
    { id: 'context', label: 'Context' },
    { id: 'overview', label: 'Overview' },
  ] as const
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <h3>PCF Component Overview</h3>
            <div style={panelStyles.toolbar}>
              <span>Component Status: Active</span>
            </div>
            {currentContext && (
              <Explorer
                label="Current Context"
                value={currentContext}
                theme={effectiveTheme}
                defaultExpanded
              />
            )}
          </div>
        )
      
      case 'webapi':
        return (
          <div>
            <div style={panelStyles.toolbar}>
              <div>
                <label>Sort by: </label>
                <select
                  style={panelStyles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option>Status {'>'} Last Updated</option>
                  <option>Last Updated</option>
                  <option>Method</option>
                  <option>URL</option>
                </select>
              </div>
              <button
                style={panelStyles.clearButton}
                onClick={clearWebApiRequests}
              >
                Clear All ({webApiRequests.length})
              </button>
            </div>
            
            {sortedRequests.length > 0 ? (
              <div>
                {sortedRequests.map((request) => (
                  <div key={request.id} style={panelStyles.requestItem}>
                    <div style={panelStyles.requestHeader}>
                      <div>
                        <span style={panelStyles.requestMethod}>{request.method}</span>
                        <span style={{...panelStyles.requestUrl, marginLeft: tokens.size['2']}}>
                          {request.url}
                        </span>
                      </div>
                      <div
                        style={{
                          ...panelStyles.statusBadge,
                          backgroundColor: getWebApiStatusColor(request.status),
                        }}
                      >
                        {getWebApiStatusLabel(request.status)}
                      </div>
                    </div>
                    <div style={panelStyles.requestDetails}>
                      {formatTimestamp(request.timestamp)} • {formatDuration(request.duration)}
                      {request.entityLogicalName && ` • ${request.entityLogicalName}`}
                    </div>
                    {request.response && (
                      <Explorer
                        label="Response"
                        value={request.response}
                        theme={effectiveTheme}
                      />
                    )}
                    {request.error && (
                      <div style={{ color: colors.danger, marginTop: tokens.size['2'] }}>
                        Error: {request.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={panelStyles.emptyState}>
                No WebAPI requests captured yet
              </div>
            )}
          </div>
        )
      
      case 'context':
        return (
          <div>
            <div style={panelStyles.toolbar}>
              <span>Context Updates: {contextUpdates.length}</span>
              <button
                style={panelStyles.clearButton}
                onClick={clearContextUpdates}
              >
                Clear History
              </button>
            </div>
            
            {currentContext ? (
              <Explorer
                label="PCF Context"
                value={currentContext}
                theme={effectiveTheme}
                defaultExpanded
                editable={false}
              />
            ) : (
              <div style={panelStyles.emptyState}>
                No PCF context available
              </div>
            )}
          </div>
        )
      
      case 'lifecycle':
        return (
          <div>
            <h3>PCF Component Lifecycle</h3>
            
            <div style={panelStyles.toolbar}>
              <span>Control your PCF component lifecycle</span>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.size['3'],
              marginBottom: tokens.size['4']
            }}>
              <button
                style={{
                  ...panelStyles.clearButton,
                  backgroundColor: colors.active,
                  color: 'white',
                  fontWeight: tokens.font.weight['2'],
                  padding: `${tokens.size['3']} ${tokens.size['4']}`,
                }}
                onClick={triggerInit}
              >
                🔄 Trigger init()
              </button>
              
              <button
                style={{
                  ...panelStyles.clearButton,
                  backgroundColor: colors.active,
                  color: 'white',
                  fontWeight: tokens.font.weight['2'],
                  padding: `${tokens.size['3']} ${tokens.size['4']}`,
                }}
                onClick={triggerUpdate}
              >
                🔁 Trigger updateView()
              </button>
              
              <button
                style={{
                  ...panelStyles.clearButton,
                  backgroundColor: colors.danger,
                  color: 'white',
                  fontWeight: tokens.font.weight['2'],
                  padding: `${tokens.size['3']} ${tokens.size['4']}`,
                }}
                onClick={triggerDestroyInit}
              >
                🔥 Trigger destroy() → init()
              </button>
            </div>
            
            <div style={{ borderTop: `1px solid ${colors.inputBorder}`, paddingTop: tokens.size['3'] }}>
              <h4>Recent Lifecycle Events</h4>
              {contextUpdates.length > 0 ? (
                <div>
                  {contextUpdates.slice(0, 5).map((update) => (
                    <div key={update.id} style={panelStyles.requestItem}>
                      <div style={panelStyles.requestHeader}>
                        <span style={panelStyles.requestMethod}>{update.property}</span>
                        <span style={panelStyles.requestDetails}>
                          {formatTimestamp(update.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {contextUpdates.length > 5 && (
                    <div style={{ ...panelStyles.emptyState, fontSize: tokens.font.size['3'] }}>
                      ... and {contextUpdates.length - 5} more (see Context tab for full history)
                    </div>
                  )}
                </div>
              ) : (
                <div style={panelStyles.emptyState}>
                  No lifecycle events recorded yet
                </div>
              )}
            </div>
          </div>
        )
      
      default:
        return <div>Unknown tab</div>
    }
  }
  
  return (
    <div className={className} style={panelStyles.container}>
      <div style={panelStyles.header}>
        <h2 style={panelStyles.title}>PCF Devtools</h2>
        <div style={panelStyles.headerActions}>
          <select
            style={panelStyles.themeSelect}
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          {onClose && (
            <button style={panelStyles.closeButton} onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>
      
      <div style={panelStyles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...panelStyles.tab,
              ...(activeTab === tab.id ? panelStyles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={panelStyles.content}>
        {renderTabContent()}
      </div>
    </div>
  )
}