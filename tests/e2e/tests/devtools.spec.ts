import { test, expect } from '@playwright/test'

test('analyze simplified devtools UI', async ({ page }) => {
  await page.goto('')
  
  // Take screenshot before opening devtools
  await page.screenshot({ path: 'tests/e2e/screenshots/before-devtools.png', fullPage: true })
  
  // Open devtools
  await page.getByRole('button', { name: 'PCF DevTools' }).click()
  await expect(page.getByRole('button', { name: 'Close DevTools' })).toBeVisible()
  
  // Take screenshot of simplified devtools
  await page.screenshot({ path: 'tests/e2e/screenshots/devtools-simplified.png', fullPage: true })
  
  // Scroll down in the devtools to see if datasets section is there
  await page.evaluate(() => {
    const devtools = document.querySelector('[class*="devToolsContainer"]')
    if (devtools) {
      devtools.scrollTop = devtools.scrollHeight
    }
  })
  
  await page.screenshot({ path: 'tests/e2e/screenshots/devtools-scrolled.png', fullPage: true })
  
  // Verify simplified interface elements are present
  await expect(page.getByText('ENTITIES')).toBeVisible()
  
  // Test lifecycle buttons - these should be unique
  await expect(page.getByRole('button', { name: 'Run Init' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run UpdateView' })).toBeVisible()
  
  // Check if the DevTools opened successfully and shows basic info
  console.log('DevTools opened successfully with simplified interface!')
  
  // Check network requests
  const requests = []
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    })
  })
  
  // Wait a bit to capture any network activity
  await page.waitForTimeout(1000)
  
  console.log('Network requests:', requests)
  
  // Take final screenshot
  await page.screenshot({ path: 'tests/e2e/screenshots/devtools-final.png', fullPage: true })
})
