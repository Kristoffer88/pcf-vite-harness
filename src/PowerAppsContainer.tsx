import * as React from 'react'

interface PowerAppsContainerProps {
  context: ComponentFramework.Context<any>
  pcfClass: new () => ComponentFramework.StandardControl<any, any>
  className?: string
  showDevPanel?: boolean
}

export const PowerAppsContainer: React.FC<PowerAppsContainerProps> = ({
  context,
  pcfClass,
  className = '',
  showDevPanel = true,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const pcfComponentRef = React.useRef<ComponentFramework.StandardControl<any, any> | null>(null)

  React.useEffect(() => {
    if (containerRef.current && !pcfComponentRef.current) {
      // Initialize PCF component just like PowerApps does
      pcfComponentRef.current = new pcfClass()
      pcfComponentRef.current.init(
        context,
        () => console.log('PCF notifyOutputChanged called'),
        {},
        containerRef.current
      )
      pcfComponentRef.current.updateView(context)
    }

    return () => {
      if (pcfComponentRef.current) {
        pcfComponentRef.current.destroy()
        pcfComponentRef.current = null
      }
    }
  }, [context, pcfClass])

  return (
    <div
      id="tab-section2"
      className={`pa-g pa-ae pa-h pa-ht pa-cf pa-pb pa-du pa-bx webkitScroll flexbox ${className}`}
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'auto',
        backgroundColor: '#f3f2f1',
        fontFamily:
          '"Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
      }}
    >
      <div className="pa-op pa-gm flexbox" style={{ height: '100%', width: '100%' }}>
        <div
          id="id-875"
          aria-label="PCF Control"
          role="tabpanel"
          className="pa-g pa-cf pa-no pa-qm pa-bx pa-bf pa-pd forceNewStackContext flexbox"
          style={{ height: '100%', width: '100%', flex: '1 1 auto' }}
        >
          <div
            id="id-872_2"
            className="pa-kr pa-cf pa-bu pa-bx pa-oe pa-qn flexbox"
            style={{ height: '100%', width: '100%' }}
          >
            <div
              className="pa-g pa-ct pa-h pa-j pa-hq webkitScroll flexbox"
              style={{ height: '100%', width: '100%' }}
            >
              <div
                id="dataSetRoot_Subgrid_new_2_outer"
                className="pa-g pa-ct pa-h pa-nk pa-nh flexbox"
                style={{ height: '100%', width: '100%' }}
              >
                <div
                  id="DataSetHostContainer_dataSetRoot_Subgrid_new_2"
                  className="pa-g pa-ct pa-h pa-nk pa-nh flexbox"
                  style={{ height: '100%', width: '100%' }}
                >
                  <div
                    id="dataSetRoot_Subgrid_new_2"
                    className="pa-g pa-ct pa-h pa-nk pa-nh flexbox"
                    style={{ height: '100%', width: '100%' }}
                  >
                    <div
                      className="pa-g pa-ct pa-bf pa-oe pa-bx pa-of pa-og flexbox"
                      style={{ height: '100%', width: '100%' }}
                    >
                      <div
                        className="pa-g pa-ct pa-k pa-ol flexbox"
                        style={{ height: '100%', width: '100%' }}
                      >
                        <div
                          className="pa-cf pa-ct pa-ox flexbox"
                          style={{ height: '100%', width: '100%' }}
                        >
                          <div
                            id="id-c98688f0-2676-483b-ae68-504795de5dfe-121_outer"
                            className="pa-cf flexbox"
                            style={{ height: '100%', width: '100%', position: 'relative' }}
                          >
                            <div
                              id="id-c98688f0-2676-483b-ae68-504795de5dfe-12"
                              className="pa-cf flexbox"
                              style={{ height: '100%', width: '100%' }}
                            >
                              {/* PCF Component Container - exactly like PowerApps */}
                              <div
                                className="customControl pcf-component flexbox"
                                data-id="pcf_container"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: '100vh',
                                }}
                                ref={containerRef}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dev Tools Panel */}
      {showDevPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '12px',
            zIndex: 1001,
          }}
        >
          <div>
            <strong>PCF Vite Harness</strong>
          </div>
          <div>
            Control ID:{' '}
            {(context as any)?.accessibility?._customControlProperties?.descriptor?.DomId || 'N/A'}
          </div>
          <div>View ID: {context.parameters?.data?.getViewId?.() || 'N/A'}</div>
        </div>
      )}
    </div>
  )
}
