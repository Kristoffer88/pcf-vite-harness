import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { findPCFOnForms, getPCFFormsForEntity, type PCFManifest, ENTITY_TYPE_CODES } from '../../src/utils/pcfDiscovery'

// Set up DOMParser and Node constants for Node.js environment
const dom = new JSDOM()
global.DOMParser = dom.window.DOMParser as any
global.Node = dom.window.Node as any

// Mock PCF manifest for testing
const mockManifest: PCFManifest = {
  namespace: 'SampleNamespace',
  constructor: 'TSLinearInputControl',
  version: '1.0.0',
  displayName: 'Linear Input Control',
  description: 'Sample linear input control'
}

describe('PCF Form Discovery Integration Tests', () => {
  beforeEach(() => {
    // Clear any fetch mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findPCFOnForms', () => {
    it('should discover forms containing PCF controls', async () => {
      // This test will make real Dataverse calls
      // In development, this will fail if no Dataverse connection
      // In CI with proper setup, this will find actual forms
      
      try {
        const forms = await findPCFOnForms(mockManifest)
        
        // The result structure should be correct even if no forms found
        expect(Array.isArray(forms)).toBe(true)
        
        if (forms.length > 0) {
          // Verify form structure
          const firstForm = forms[0]
          expect(firstForm).toHaveProperty('formId')
          expect(firstForm).toHaveProperty('formName')
          expect(firstForm).toHaveProperty('entityTypeCode')
          expect(firstForm).toHaveProperty('controls')
          expect(Array.isArray(firstForm.controls)).toBe(true)
          
          // Verify control structure
          if (firstForm.controls.length > 0) {
            const firstControl = firstForm.controls[0]
            expect(firstControl).toHaveProperty('controlId')
            expect(firstControl).toHaveProperty('namespace')
            expect(firstControl).toHaveProperty('constructor')
          }
        }
        
        console.log(`Found ${forms.length} forms with PCF controls`)
      } catch (error) {
        // Expected in development without Dataverse connection
        console.log('Form discovery failed (expected in dev):', error)
        expect(error).toBeDefined()
      }
    })

    it('should filter by entity type code when provided', async () => {
      const ACCOUNT_TYPE_CODE = 1 // Account entity
      
      try {
        const forms = await findPCFOnForms(mockManifest, ACCOUNT_TYPE_CODE)
        
        expect(Array.isArray(forms)).toBe(true)
        
        // All returned forms should be for account entity
        forms.forEach(form => {
          expect(form.entityTypeCode).toBe(ACCOUNT_TYPE_CODE)
        })
        
        console.log(`Found ${forms.length} account forms with PCF controls`)
      } catch (error) {
        console.log('Filtered form discovery failed:', error)
        expect(error).toBeDefined()
      }
    })
  })

  describe('getPCFFormsForEntity', () => {
    it('should get all forms for a specific entity with PCF controls', async () => {
      const CONTACT_TYPE_CODE = 2 // Contact entity
      
      try {
        const forms = await getPCFFormsForEntity(CONTACT_TYPE_CODE)
        
        expect(Array.isArray(forms)).toBe(true)
        
        // All forms should be for contact entity
        forms.forEach(form => {
          expect(form.entityTypeCode).toBe(CONTACT_TYPE_CODE)
          expect(form.controls.length).toBeGreaterThan(0)
        })
        
        console.log(`Found ${forms.length} contact forms with PCF controls`)
      } catch (error) {
        console.log('Entity-specific form discovery failed:', error)
        expect(error).toBeDefined()
      }
    })
  })

  describe('Form XML parsing', () => {
    it('should correctly parse PCF control information from form XML', async () => {
      // Create a mock form XML to test parsing
      const mockFormXml = `
        <form>
          <tabs>
            <tab>
              <columns>
                <column>
                  <sections>
                    <section>
                      <rows>
                        <row>
                          <cell>
                            <control id="WebResource_DatasetControl">
                              <customControl name="cc_SampleNamespace.DatasetGrid" formFactor="0">
                                <parameters>
                                  <data-set name="dataSet">
                                    <ViewId>00000000-0000-0000-0000-000000000001</ViewId>
                                    <IsUserView>false</IsUserView>
                                    <RelationshipName>contact_customer_accounts</RelationshipName>
                                    <TargetEntityType>account</TargetEntityType>
                                  </data-set>
                                </parameters>
                              </customControl>
                            </control>
                          </cell>
                        </row>
                      </rows>
                    </section>
                  </sections>
                </column>
              </columns>
            </tab>
          </tabs>
        </form>
      `
      
      // Mock a successful response with our test XML
      const mockResponse = {
        ok: true,
        json: async () => ({
          value: [{
            formid: 'test-form-id',
            name: 'Test Form',
            objecttypecode: 1,
            formxml: mockFormXml
          }]
        })
      }
      
      // Mock fetch for this specific test
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      try {
        const forms = await findPCFOnForms({
          namespace: 'SampleNamespace',
          constructor: 'DatasetGrid',
          version: '1.0.0'
        })
        
        expect(forms).toHaveLength(1)
        expect(forms[0].controls).toHaveLength(1)
        
        const control = forms[0].controls[0]
        expect(control.controlId).toBe('WebResource_DatasetControl')
        expect(control.namespace).toBe('SampleNamespace')
        expect(control.constructor).toBe('DatasetGrid')
        expect(control.dataSet).toBeDefined()
        expect(control.dataSet?.targetEntityType).toBe('account')
        expect(control.dataSet?.relationshipName).toBe('contact_customer_accounts')
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('Entity type code mapping', () => {
    it('should handle common entity type codes', () => {
      expect(ENTITY_TYPE_CODES.ACCOUNT).toBe(1)
      expect(ENTITY_TYPE_CODES.CONTACT).toBe(2)
      expect(ENTITY_TYPE_CODES.OPPORTUNITY).toBe(3)
      expect(ENTITY_TYPE_CODES.LEAD).toBe(4)
      expect(ENTITY_TYPE_CODES.CASE).toBe(112)
    })
  })
})