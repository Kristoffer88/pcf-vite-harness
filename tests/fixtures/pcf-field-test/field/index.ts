import type { IInputs, IOutputs } from './generated/ManifestTypes'

interface SystemUser {
  systemuserid: string
  fullname: string
  domainname: string
  internalemailaddress: string
}

export class field implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container: HTMLDivElement
  private _context: ComponentFramework.Context<IInputs>
  private _loadingElement: HTMLDivElement
  private _usersContainer: HTMLDivElement
  private _refreshButton: HTMLButtonElement

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

    // Create main container
    this._container.innerHTML = `
            <div style="padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <h2 style="color: #323130; margin: 0;">System Users Field</h2>
                    <button id="refresh-btn" style="
                        background: #0078d4; 
                        color: white; 
                        border: none; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 12px;
                    ">Refresh</button>
                </div>
                <div id="loading" style="display: block; color: #605e5c;">Loading system users...</div>
                <div id="users-container" style="display: none;"></div>
            </div>
        `

    this._loadingElement = this._container.querySelector('#loading') as HTMLDivElement
    this._usersContainer = this._container.querySelector('#users-container') as HTMLDivElement
    this._refreshButton = this._container.querySelector('#refresh-btn') as HTMLButtonElement

    // Add refresh button event listener
    this._refreshButton.addEventListener('click', () => {
      this.loadSystemUsers()
    })

    // Load system users
    this.loadSystemUsers()
  }

  private async loadSystemUsers(): Promise<void> {
    this._loadingElement.style.display = 'block'
    this._usersContainer.style.display = 'none'
    this._refreshButton.disabled = true
    this._refreshButton.textContent = 'Loading...'

    try {
      const response = await this._context.webAPI.retrieveMultipleRecords(
        'systemuser',
        '?$select=systemuserid,fullname,domainname,internalemailaddress&$top=5&$orderby=createdon desc'
      )

      this.renderSystemUsers(response.entities as SystemUser[])
    } catch (error) {
      console.error('Error loading system users:', error)
      this._loadingElement.innerHTML = `
                <div style="color: #a80000; padding: 10px; background: #fed9cc; border-radius: 4px;">
                    <strong>Error:</strong> Failed to load system users. ${error}
                </div>
            `
    } finally {
      this._refreshButton.disabled = false
      this._refreshButton.textContent = 'Refresh'
    }
  }

  private renderSystemUsers(users: SystemUser[]): void {
    this._loadingElement.style.display = 'none'
    this._usersContainer.style.display = 'block'

    let html = '<div style="display: grid; gap: 8px;">'

    users.forEach((user, index) => {
      html += `
                <div style="
                    background: #f8f9fa; 
                    padding: 12px; 
                    border-radius: 4px;
                    border: 1px solid #e1e5e9;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="
                        width: 32px; 
                        height: 32px; 
                        background: #0078d4; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        color: white;
                        font-weight: 600;
                        font-size: 12px;
                    ">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #323130; margin-bottom: 2px;">
                            ${user.fullname || 'Unknown User'}
                        </div>
                        <div style="font-size: 12px; color: #605e5c;">
                            ${user.internalemailaddress || user.domainname || 'No email'}
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #8a8886; font-family: monospace;">
                        ${user.systemuserid?.substring(0, 8) || 'N/A'}...
                    </div>
                </div>
            `
    })

    html += '</div>'
    html += `
            <div style="margin-top: 12px; padding: 8px 12px; background: #f0f8ff; border-radius: 4px; font-size: 11px; color: #605e5c; border-left: 3px solid #0078d4;">
                <strong>WebAPI Call:</strong> Retrieved ${users.length} most recent system users
            </div>
        `

    this._usersContainer.innerHTML = html
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context
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
