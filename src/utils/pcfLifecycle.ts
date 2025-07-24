/**
 * Simple PCF Lifecycle Management
 * Function-based approach without classes
 */

export interface PCFInstanceManager {
  instance: ComponentFramework.StandardControl<any, any> | null
  container: HTMLDivElement
  context: ComponentFramework.Context<any>
  pcfClass: new () => ComponentFramework.StandardControl<any, any>
}

export function createPCFManager(
  pcfClass: new () => ComponentFramework.StandardControl<any, any>,
  context: ComponentFramework.Context<any>,
  container: HTMLDivElement
): PCFInstanceManager {
  return {
    instance: null,
    container,
    context,
    pcfClass
  }
}

export async function initPCF(manager: PCFInstanceManager): Promise<void> {
  if (!manager.container) {
    console.warn('Container not available for PCF initialization')
    return
  }

  try {
    // Destroy existing instance if present
    if (manager.instance) {
      console.log('🔄 Destroying existing PCF component before reinit')
      manager.instance.destroy()
      manager.instance = null
    }

    // Clear container
    manager.container.innerHTML = ''

    // Create new PCF component instance
    console.log('🔄 Initializing PCF component')
    manager.instance = new manager.pcfClass()

    // Initialize the component
    await manager.instance.init(
      manager.context,
      () => console.log('PCF notifyOutputChanged called'),
      {},
      manager.container
    )

    // Update view
    await manager.instance.updateView(manager.context)
    console.log('✅ PCF Component initialized successfully')
  } catch (error) {
    console.error('❌ PCF Init failed:', error)
    throw error
  }
}

export async function updatePCFView(manager: PCFInstanceManager): Promise<void> {
  if (!manager.instance) {
    console.warn('No PCF component instance available for updateView')
    return
  }

  try {
    console.log('🔁 Calling PCF updateView')
    await manager.instance.updateView(manager.context)
    console.log('✅ PCF updateView completed')
  } catch (error) {
    console.error('❌ PCF updateView failed:', error)
    throw error
  }
}

export async function destroyPCF(manager: PCFInstanceManager): Promise<void> {
  if (!manager.instance) {
    console.warn('No PCF component instance available for destroy')
    return
  }

  try {
    console.log('🔥 Destroying PCF component')
    manager.instance.destroy()
    manager.instance = null

    // Clear container
    manager.container.innerHTML = ''

    console.log('✅ PCF Component destroyed')
  } catch (error) {
    console.error('❌ PCF destroy failed:', error)
    throw error
  }
}

export function isPCFInitialized(manager: PCFInstanceManager): boolean {
  return !!manager.instance
}