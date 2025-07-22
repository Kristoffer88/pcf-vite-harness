import { describe, expect, it } from 'vitest'
import 'dotenv/config'

// Test to analyze different types of Dataverse API errors
describe('Dataverse Error Analysis', () => {
  const dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com'

  async function analyzeError(testName: string, url: string, options?: RequestInit) {
    console.log(`\n🧪 Testing: ${testName}`)
    console.log(`📡 URL: ${url}`)

    try {
      const response = await fetch(url, options)

      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log(`📄 JSON Response:`, JSON.stringify(data, null, 2))
      } catch {
        console.log(`📄 Raw Response:`, responseText)
      }

      return { response, data, responseText }
    } catch (error) {
      console.log(`❌ Network Error:`, error.message)
      return { error }
    }
  }

  describe('Generate Various Error Types', () => {
    it('should analyze invalid entity name error', async () => {
      await analyzeError(
        'Invalid Entity Name',
        `${dataverseUrl}/api/data/v9.1/invalidentity?$select=name&$top=1`
      )
    })

    it('should analyze invalid field name error', async () => {
      await analyzeError(
        'Invalid Field Name',
        `${dataverseUrl}/api/data/v9.1/contacts?$select=invalidfield&$top=1`
      )
    })

    it('should analyze invalid filter syntax error', async () => {
      await analyzeError(
        'Invalid Filter Syntax',
        `${dataverseUrl}/api/data/v9.1/contacts?$filter=invalidfield invalid syntax&$top=1`
      )
    })

    it('should analyze invalid GUID format error', async () => {
      await analyzeError(
        'Invalid GUID Format',
        `${dataverseUrl}/api/data/v9.1/contacts?$filter=contactid eq invalid-guid&$top=1`
      )
    })

    it('should analyze non-existent record error', async () => {
      await analyzeError(
        'Non-existent Record',
        `${dataverseUrl}/api/data/v9.1/contacts(00000000-0000-0000-0000-000000000000)`
      )
    })

    it('should analyze unauthorized access error', async () => {
      // Remove authorization header to force auth error
      await analyzeError('Unauthorized Access', `${dataverseUrl}/api/data/v9.1/contacts?$top=1`, {
        headers: { Authorization: 'Bearer invalid-token' },
      })
    })

    it('should analyze invalid OData query error', async () => {
      await analyzeError(
        'Invalid OData Query',
        `${dataverseUrl}/api/data/v9.1/contacts?$invalidparam=test&$top=1`
      )
    })

    it('should analyze invalid relationship navigation error', async () => {
      await analyzeError(
        'Invalid Relationship Navigation',
        `${dataverseUrl}/api/data/v9.1/contacts?$filter=invalidrelationship/accountid eq 123&$top=1`
      )
    })

    it('should analyze method not allowed error', async () => {
      await analyzeError(
        'Method Not Allowed',
        `${dataverseUrl}/api/data/v9.1/contacts`,
        { method: 'DELETE' } // DELETE without ID should fail
      )
    })

    it('should analyze invalid content type error', async () => {
      await analyzeError('Invalid Content Type', `${dataverseUrl}/api/data/v9.1/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'invalid body',
      })
    })

    it('should analyze malformed JSON error', async () => {
      await analyzeError('Malformed JSON', `${dataverseUrl}/api/data/v9.1/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      })
    })

    it('should analyze rate limit error (if applicable)', async () => {
      // Make rapid requests to potentially trigger rate limiting
      console.log('\n🔄 Testing potential rate limiting...')
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          analyzeError(`Rate Limit Test ${i + 1}`, `${dataverseUrl}/api/data/v9.1/contacts?$top=1`)
        )
      }
      await Promise.all(promises)
    })

    it('should analyze server error simulation', async () => {
      // Try to cause server error with complex invalid query
      await analyzeError(
        'Complex Invalid Query',
        `${dataverseUrl}/api/data/v9.1/contacts?$filter=((((invalidfield eq 'test' and anotherbadfield contains 'value') or (badrelation/badfield eq 123)) and (yetanotherbad gt 'string')))&$select=badfield1,badfield2,badfield3&$expand=badrelation($select=badsubfield)&$orderby=badorderfield desc&$top=999999`
      )
    })
  })

  describe('Analyze Successful Responses', () => {
    it('should analyze successful response structure', async () => {
      await analyzeError(
        'Successful Response',
        `${dataverseUrl}/api/data/v9.1/contacts?$select=fullname,contactid&$top=2`
      )
    })

    it('should analyze empty result response', async () => {
      await analyzeError(
        'Empty Result Response',
        `${dataverseUrl}/api/data/v9.1/contacts?$filter=contactid eq '00000000-0000-0000-0000-000000000000'&$top=1`
      )
    })
  })
})
