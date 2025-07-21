import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;

interface SystemUser {
    systemuserid: string;
    fullname: string;
    domainname: string;
    businessunitid: string;
}

export class dataset implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _loadingElement: HTMLDivElement;
    private _usersContainer: HTMLDivElement;

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
        this._container = container;
        this._context = context;

        // Create main container
        this._container.innerHTML = `
            <div style="padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <h2 style="color: #323130; margin-bottom: 16px;">System Users Dataset</h2>
                <div id="loading" style="display: block; color: #605e5c;">Loading system users...</div>
                <div id="users-container" style="display: none;"></div>
            </div>
        `;

        this._loadingElement = this._container.querySelector('#loading') as HTMLDivElement;
        this._usersContainer = this._container.querySelector('#users-container') as HTMLDivElement;

        // Load system users
        this.loadSystemUsers();
    }

    private async loadSystemUsers(): Promise<void> {
        try {
            const response = await this._context.webAPI.retrieveMultipleRecords(
                'systemuser',
                '?$select=systemuserid,fullname,domainname,businessunitid&$top=5&$orderby=fullname'
            );

            this.renderSystemUsers(response.entities as SystemUser[]);
        } catch (error) {
            console.error('Error loading system users:', error);
            this._loadingElement.innerHTML = `
                <div style="color: #a80000; padding: 10px; background: #fed9cc; border-radius: 4px;">
                    <strong>Error:</strong> Failed to load system users. ${error}
                </div>
            `;
        }
    }

    private renderSystemUsers(users: SystemUser[]): void {
        this._loadingElement.style.display = 'none';
        this._usersContainer.style.display = 'block';

        let html = '<div style="display: grid; gap: 12px;">';
        
        users.forEach((user, index) => {
            html += `
                <div style="
                    background: #f3f2f1; 
                    padding: 16px; 
                    border-radius: 6px;
                    border-left: 4px solid #0078d4;
                ">
                    <div style="font-weight: 600; color: #323130; margin-bottom: 4px;">
                        ${index + 1}. ${user.fullname || 'N/A'}
                    </div>
                    <div style="font-size: 12px; color: #605e5c;">
                        <div>Domain: ${user.domainname || 'N/A'}</div>
                        <div>ID: ${user.systemuserid || 'N/A'}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        html += `
            <div style="margin-top: 16px; padding: 12px; background: #e6f3ff; border-radius: 4px; font-size: 12px; color: #605e5c;">
                <strong>Network Call:</strong> Retrieved ${users.length} system users from Dataverse
            </div>
        `;

        this._usersContainer.innerHTML = html;
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {};
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}