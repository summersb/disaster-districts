import { test as baseTest, expect } from '@playwright/test'
import { addCoverageReport } from 'monocart-reporter'

// Collects Chromium V8/CSS coverage for every test automatically and feeds
// it into monocart-reporter's global coverage report. Import `test`/`expect`
// from this file instead of '@playwright/test' in e2e specs.
export const test = baseTest.extend<{ autoTestFixture: string }>({
  autoTestFixture: [
    async ({ page }, use, testInfo) => {
      const isChromium = testInfo.project.name === 'chromium'

      if (isChromium) {
        await Promise.all([
          page.coverage.startJSCoverage({ resetOnNavigation: false }),
          page.coverage.startCSSCoverage({ resetOnNavigation: false }),
        ])
      }

      await use('autoTestFixture')

      if (isChromium) {
        const [jsCoverage, cssCoverage] = await Promise.all([
          page.coverage.stopJSCoverage(),
          page.coverage.stopCSSCoverage(),
        ])
        await addCoverageReport([...jsCoverage, ...cssCoverage], testInfo)
      }
    },
    { scope: 'test', auto: true },
  ],
})

export { expect }
