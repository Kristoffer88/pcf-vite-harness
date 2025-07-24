/**
 * Simple Dataset Refresh Utility
 * Replaces the complex PCFDevToolsConnector with a straightforward approach
 */

import { detectDatasetParameters } from './datasetAnalyzer'
import { BackgroundDataLoader } from './backgroundDataLoader'

export class SimpleDatasetRefresh {
  private context: ComponentFramework.Context<any> | null = null
  private updateViewCallback: (() => void) | null = null
  private backgroundLoader: BackgroundDataLoader | null = null

  initialize(context: ComponentFramework.Context<any>, updateViewCallback: () => void) {
    this.context = context
    this.updateViewCallback = updateViewCallback
    this.backgroundLoader = new BackgroundDataLoader()
    
    console.log('🔧 Simple dataset refresh initialized')
    
    // Start auto-refresh if enabled
    this.startAutoRefresh()
  }

  private async startAutoRefresh() {
    if (!this.context || !this.backgroundLoader) return

    try {
      console.log('🚀 Starting simple dataset refresh...')
      
      // Initialize the background loader
      await this.backgroundLoader.initialize(this.context, async () => {
        console.log('🔄 Dataset refreshed, triggering updateView...')
        if (this.updateViewCallback) {
          this.updateViewCallback()
        }
      })
      
    } catch (error) {
      console.error('❌ Simple dataset refresh failed:', error)
    }
  }

  async refreshNow() {
    if (!this.backgroundLoader) {
      console.warn('⚠️ Background loader not initialized')
      return
    }

    try {
      console.log('🔄 Manual dataset refresh triggered...')
      await this.backgroundLoader.refreshData()
    } catch (error) {
      console.error('❌ Manual refresh failed:', error)
    }
  }

  cleanup() {
    this.context = null
    this.updateViewCallback = null
    this.backgroundLoader = null
    console.log('🧹 Simple dataset refresh cleaned up')
  }
}

// Export a singleton instance
export const simpleDatasetRefresh = new SimpleDatasetRefresh()