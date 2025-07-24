import type { IInputs, IOutputs } from './generated/ManifestTypes'

import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi
type DataSet = ComponentFramework.PropertyTypes.DataSet

// Enhanced record interface for test data
interface EnhancedEntityRecord extends DataSetInterfaces.EntityRecord {
  _entityReference?: {
    _name?: string
  }
  _primaryFieldName?: string
}

export class dataset implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement
  private _context: ComponentFramework.Context<IInputs>
  private _datasetContainer: HTMLDivElement

  /**
   * Empty constructor.
   */
  constructor() {
    // Empty
  }

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._container = container
    this._context = context

    // Create simple container for dataset display
    this._container.innerHTML = `
      <div style="padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <h2 style="color: #323130; margin: 0 0 16px 0;">Dataset Test Component</h2>
        <div id="dataset-container">No dataset records available yet</div>
      </div>
    `

    this._datasetContainer = this._container.querySelector('#dataset-container') as HTMLDivElement
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context

    // Display dataset records if available
    const sampleDataSet = context.parameters.sampleDataSet
    if (sampleDataSet && sampleDataSet.records) {
      const recordCount = Object.keys(sampleDataSet.records).length
      console.log(`📋 Dataset updated: ${recordCount} records available`)

      if (recordCount > 0) {
        let html = `<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-bottom: 16px;">
          <strong>Dataset Records (${recordCount}):</strong><br>
          <div style="font-size: 12px; color: #6c757d; margin-top: 8px;">
            Entity: ${sampleDataSet.getTargetEntityType ? sampleDataSet.getTargetEntityType() : 'Unknown'}<br>
            View ID: ${sampleDataSet.getViewId ? sampleDataSet.getViewId().substring(0, 8) + '...' : 'None'}
          </div>
        </div>`

        html += '<div style="display: grid; gap: 8px;">'

        const recordKeys = Object.keys(sampleDataSet.records)
        recordKeys.forEach((key, index) => {
          const record = sampleDataSet.records[key] as EnhancedEntityRecord
          // Check for _entityReference._name first (set by datasetGenerator)
          let displayName = ''
          if (record._entityReference && record._entityReference._name) {
            displayName = record._entityReference._name
          } else if (record.getFormattedValue) {
            // Fallback to getFormattedValue
            displayName =
              record.getFormattedValue('name') || record.getFormattedValue('fullname') || ''
          }

          html += `
            <div style="
              background: #ffffff; 
              padding: 12px; 
              border: 1px solid #e9ecef;
              border-radius: 4px;
            ">
              <div style="font-weight: 600; color: #495057; margin-bottom: 4px;">
                ${displayName}
              </div>
              <div style="font-size: 11px; color: #6c757d;">
                ID: ${key}
              </div>
            </div>
          `
        })

        html += '</div>'
        this._datasetContainer.innerHTML = html
      } else {
        this._datasetContainer.innerHTML =
          '<div style="color: #6c757d; font-style: italic;">No records in dataset</div>'
      }
    } else {
      this._datasetContainer.innerHTML =
        '<div style="color: #6c757d; font-style: italic;">Dataset not yet loaded</div>'
    }
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    return {}
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
  }
}
