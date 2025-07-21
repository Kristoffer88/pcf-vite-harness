import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;

export class dataset implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;

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
        this._context = context;
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;

        // Create main container
        const mainContainer = document.createElement("div");
        mainContainer.style.padding = "20px";
        mainContainer.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";

        // Title
        const title = document.createElement("h2");
        title.textContent = "PCF Dataset Test Component (Real Dataverse)";
        title.style.color = "#2c5aa0";
        title.style.marginBottom = "20px";
        mainContainer.appendChild(title);

        // Dataset info
        const datasetInfo = document.createElement("div");
        datasetInfo.style.marginBottom = "20px";
        datasetInfo.style.padding = "15px";
        datasetInfo.style.backgroundColor = "#f8f9fa";
        datasetInfo.style.border = "1px solid #dee2e6";
        datasetInfo.style.borderRadius = "5px";
        
        const infoTitle = document.createElement("h3");
        infoTitle.textContent = "Dataset Information";
        infoTitle.style.marginTop = "0";
        datasetInfo.appendChild(infoTitle);

        mainContainer.appendChild(datasetInfo);

        // Records container
        const recordsContainer = document.createElement("div");
        recordsContainer.id = "records-container";
        recordsContainer.style.border = "1px solid #dee2e6";
        recordsContainer.style.borderRadius = "5px";
        recordsContainer.style.minHeight = "200px";
        recordsContainer.style.padding = "15px";
        
        mainContainer.appendChild(recordsContainer);

        this._container.appendChild(mainContainer);
        
        // Initial render
        this.renderDataset();
    }

    private renderDataset(): void {
        const recordsContainer = this._container.querySelector("#records-container") as HTMLDivElement;
        if (!recordsContainer) return;

        const dataset = this._context.parameters.sampleDataSet;
        
        if (dataset.loading) {
            recordsContainer.innerHTML = "<p>Loading dataset...</p>";
            return;
        }

        // Clear previous content
        recordsContainer.innerHTML = "";

        // Dataset statistics
        const statsDiv = document.createElement("div");
        statsDiv.style.marginBottom = "15px";
        statsDiv.style.padding = "10px";
        statsDiv.style.backgroundColor = "#e7f3ff";
        statsDiv.style.borderRadius = "3px";
        
        const totalRecords = dataset.sortedRecordIds.length;
        const hasNextPage = dataset.paging.hasNextPage;
        const hasPrevPage = dataset.paging.hasPreviousPage;
        
        statsDiv.innerHTML = `
            <strong>Records:</strong> ${totalRecords} | 
            <strong>Has Next:</strong> ${hasNextPage} | 
            <strong>Has Previous:</strong> ${hasPrevPage}
        `;
        recordsContainer.appendChild(statsDiv);

        // Column headers
        if (dataset.columns.length > 0) {
            const headersDiv = document.createElement("div");
            headersDiv.style.display = "grid";
            headersDiv.style.gridTemplateColumns = `repeat(${Math.min(dataset.columns.length, 4)}, 1fr)`;
            headersDiv.style.gap = "10px";
            headersDiv.style.padding = "10px";
            headersDiv.style.backgroundColor = "#f8f9fa";
            headersDiv.style.fontWeight = "bold";
            headersDiv.style.borderBottom = "2px solid #2c5aa0";
            headersDiv.style.marginBottom = "10px";

            // Show first 4 columns
            dataset.columns.slice(0, 4).forEach(column => {
                const headerCell = document.createElement("div");
                headerCell.textContent = column.displayName;
                headersDiv.appendChild(headerCell);
            });
            recordsContainer.appendChild(headersDiv);

            // Records
            dataset.sortedRecordIds.forEach((recordId, index) => {
                const record = dataset.records[recordId];
                
                const recordDiv = document.createElement("div");
                recordDiv.style.display = "grid";
                recordDiv.style.gridTemplateColumns = `repeat(${Math.min(dataset.columns.length, 4)}, 1fr)`;
                recordDiv.style.gap = "10px";
                recordDiv.style.padding = "10px";
                recordDiv.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f8f9fa";
                recordDiv.style.border = "1px solid #dee2e6";
                recordDiv.style.marginBottom = "5px";
                recordDiv.style.cursor = "pointer";
                
                recordDiv.addEventListener("click", () => {
                    dataset.setSelectedRecordIds([recordId]);
                    this._notifyOutputChanged();
                    alert(`Record selected: ${record.getNamedReference().name || recordId}`);
                });

                // Add first 4 column values
                dataset.columns.slice(0, 4).forEach(column => {
                    const cellDiv = document.createElement("div");
                    const cellValue = record.getValue(column.name);
                    cellDiv.textContent = this.formatCellValue(cellValue);
                    cellDiv.style.padding = "5px";
                    recordDiv.appendChild(cellDiv);
                });

                recordsContainer.appendChild(recordDiv);
            });
        }

        if (totalRecords === 0) {
            const noDataDiv = document.createElement("div");
            noDataDiv.textContent = "No records to display";
            noDataDiv.style.textAlign = "center";
            noDataDiv.style.color = "#6c757d";
            noDataDiv.style.padding = "40px";
            recordsContainer.appendChild(noDataDiv);
        }
    }

    private formatCellValue(value: string | number | boolean | Date | null | undefined): string {
        if (value === null || value === undefined) {
            return "";
        }
        
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }
        
        if (typeof value === "boolean") {
            return value ? "Yes" : "No";
        }
        
        return String(value);
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        
        // Re-render dataset when data changes
        this.renderDataset();
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