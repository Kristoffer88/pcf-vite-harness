import * as React from 'react'
import { createPCFManager, initPCF, updatePCFView, destroyPCF, type PCFInstanceManager } from './utils/pcfLifecycle'
import { startAutoLoad } from './utils/simpleDatasetLoader'

interface PowerAppsContainerProps {
  context: ComponentFramework.Context<any>
  pcfClass: new () => ComponentFramework.StandardControl<any, any>
  className?: string
  showDevPanel?: boolean
  devtoolsPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  manifestInfo?: {
    namespace: string
    constructor: string
    version: string
    displayName?: string
    description?: string
  }
}

// Inner component that manages PCF lifecycle
const PowerAppsContainerInner: React.FC<
  PowerAppsContainerProps & { containerRef: React.RefObject<HTMLDivElement> }
> = ({ context, pcfClass, className = '', showDevPanel = true, manifestInfo, containerRef }) => {
  const pcfManagerRef = React.useRef<PCFInstanceManager | null>(null)

  React.useEffect(() => {
    // Initialize PCF lifecycle manager when container is ready
    if (containerRef.current && !pcfManagerRef.current) {
      pcfManagerRef.current = createPCFManager(pcfClass, context, containerRef.current)
      
      // Auto-initialize when component mounts
      initPCF(pcfManagerRef.current).catch(console.error)
    }

    // Cleanup on unmount
    return () => {
      if (pcfManagerRef.current) {
        destroyPCF(pcfManagerRef.current).catch(console.error)
        pcfManagerRef.current = null
      }
    }
  }, [pcfClass, context])

  React.useEffect(() => {
    // Start simple dataset loading
    if (context && pcfManagerRef.current) {
      startAutoLoad(context, () => {
        console.log('🔄 Dataset loaded, triggering updateView...')
        if (pcfManagerRef.current) {
          updatePCFView(pcfManagerRef.current).catch(console.error)
        }
      })
    }
  }, [context])

  return (
    <div
      id="tab-section2"
      className={`pa-g pa-ae pa-h pa-ht pa-cf pa-pb pa-du pa-bx flexbox ${className}`}
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
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
              className="pa-g pa-ct pa-h pa-j pa-hq flexbox"
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
                              {/* PCF Component Container */}
                              <div
                                className="customControl pcf-component flexbox"
                                data-id="pcf_container"
                                style={{
                                  width: '100%',
                                  height: '100%',
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
      {/* DevTools UI removed - keeping connector for future use */}
    </div>
  )
}

// Main component
export const PowerAppsContainer: React.FC<PowerAppsContainerProps> = props => {
  const containerRef = React.useRef<HTMLDivElement>(null!)

  return <PowerAppsContainerInner {...props} containerRef={containerRef} />
}
