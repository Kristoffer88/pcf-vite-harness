/**
 * PCF Context Type Definitions
 * Types for PowerApps Component Framework context objects
 */

import type { PCFDataset } from './dataset'

/**
 * PCF Input parameters with dataset support
 */
export interface PCFInputs extends ComponentFramework.Dictionary {
  [key: string]: ComponentFramework.PropertyTypes.Property | PCFDataset
}

/**
 * PCF Output parameters
 */
export interface PCFOutputs extends ComponentFramework.Dictionary {
  [key: string]: any
}

/**
 * Enhanced PCF Context with typed parameters
 */
export interface PCFContext<TInputs extends PCFInputs = PCFInputs> extends ComponentFramework.Context<TInputs> {
  parameters: TInputs
  webAPI: ComponentFramework.WebApi
  navigation: ComponentFramework.Navigation
  formatting: ComponentFramework.Formatting
  resources: ComponentFramework.Resources
  device: ComponentFramework.Device
  client: ComponentFramework.Client
  mode: ComponentFramework.Mode
  updatedProperties: string[]
}

/**
 * Standard Control interface with typed inputs/outputs
 */
export interface PCFStandardControl<
  TInputs extends PCFInputs = PCFInputs,
  TOutputs extends PCFOutputs = PCFOutputs
> extends ComponentFramework.StandardControl<TInputs, TOutputs> {
  init(
    context: PCFContext<TInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void
  
  updateView(context: PCFContext<TInputs>): void
  
  getOutputs(): TOutputs
  
  destroy(): void
}

/**
 * React Control interface with typed inputs/outputs
 */
export interface PCFReactControl<
  TInputs extends PCFInputs = PCFInputs,
  TOutputs extends PCFOutputs = PCFOutputs
> extends ComponentFramework.ReactControl<TInputs, TOutputs> {
  init(
    context: PCFContext<TInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary
  ): void
  
  updateView(context: PCFContext<TInputs>): React.ReactElement
  
  getOutputs(): TOutputs
  
  destroy(): void
}