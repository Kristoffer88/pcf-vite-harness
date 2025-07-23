import { setupDataverse } from 'dataverse-utilities/testing'
import { beforeAll } from 'vitest'
import 'dotenv/config'

beforeAll(async () => {
  await setupDataverse({
    dataverseUrl: process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com',
  })
})
