import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('')
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/dataset/)
})

test('shows console logs', async ({ page }) => {
  // Collect console messages
  const consoleLogs: string[] = []
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`)
  })

  await page.goto('')

  // Trigger some console logs using page.evaluate
  await page.evaluate(() => {
    console.log('Test log message')
    console.warn('Test warning message')
    console.error('Test error message')
  })

  // Wait a bit for console messages to be captured
  await page.waitForTimeout(100)

  // Verify console logs were captured
  expect(consoleLogs).toContain('log: Test log message')
  expect(consoleLogs).toContain('warning: Test warning message')
  expect(consoleLogs).toContain('error: Test error message')
  console.log('Captured console logs:', consoleLogs)
})

test('monitors network traffic', async ({ page }) => {
  // Collect network requests
  const requests: string[] = []
  const responses: { url: string; status: number }[] = []

  page.on('request', request => {
    requests.push(`${request.method()} ${request.url()}`)
  })

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
    })
  })

  await page.goto('')

  // Trigger a network request using page.evaluate
  await page.evaluate(async () => {
    try {
      await fetch('/api/test-endpoint', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Network request failed:', error)
      // Network error is expected if endpoint doesn't exist
    }
  })

  // Wait for network activity
  await page.waitForTimeout(100)

  // Verify we captured the initial page load
  expect(requests.some(req => req.includes('GET'))).toBeTruthy()
  expect(responses.some(res => res.status === 200)).toBeTruthy()

  // Verify we captured the fetch request
  expect(
    requests.some(req => req.includes('GET') && req.includes('/api/test-endpoint'))
  ).toBeTruthy()

  console.log('Captured requests:', requests)
})
