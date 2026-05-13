// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");
const { AxeBuilder } = require('@axe-core/playwright');

function validateOrder(articles) {
  const failures = [];

  for (let i = 0; i < articles.length - 1; i++) {
    if (articles[i].timestamp < articles[i + 1].timestamp) {
      failures.push({
        index: i,
        article: articles[i],
        nextArticle: articles[i + 1],
      });
    }
  }

  return failures;
}

async function accessibilityAudit(page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
}

function printReport(articles, failures, violations) {
  console.log('\n─────────────────────────────────────────────');
  console.log('  QA Wolf — Hacker News Validator');
  console.log('─────────────────────────────────────────────\n');

  console.log('  COLLECTION');
  console.log(`  ✓ ${articles.length} articles collected\n`);
}

/** Prefer installed Chrome (correct arch on Apple Silicon); fallback to bundled Chromium. */
async function launchBrowser() {
  const opts = { headless: false };
  try {
    return await chromium.launch({ ...opts, channel: "chrome" });
  } catch {
    return await chromium.launch(opts);
  }
}

async function sortHackerNewsArticles() {
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://news.ycombinator.com/newest");

  const articles = [];

  while (articles.length < 100) {
    const pageArticles = await page.$$eval('.age', (elements) => {
      return elements.map((el) => {
        const titleEl = el.closest('tr')
          ?.previousElementSibling
          ?.querySelector('.titleline a');

        const [datetime, unix] = el.getAttribute('title').split(' ');

        return {
          title: titleEl ? titleEl.innerText : 'unknown',
          timestamp: Number(unix),
          datetime,
        };
      });
    });

    articles.push(...pageArticles);

    if (articles.length > 100) {
      articles.splice(100);
    }

    if (articles.length < 100) {
      await page.click('.morelink');
      await page.waitForLoadState('networkidle');
    }
  }

  const failures = validateOrder(articles);
  const violations = await accessibilityAudit(page);

  printReport(articles, failures, violations);

  await browser.close();
}

(async () => {
  await sortHackerNewsArticles();
})();