// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
// Setup: cd qa_wolf_take_home && npm install  (downloads Chromium via postinstall)
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

  console.log('  SORT VALIDATION');
  if (failures.length === 0) {
    console.log('  ✓ PASS — all 100 articles sorted newest to oldest\n');
  } else {
    console.log(`  ✗ FAIL — ${failures.length} articles out of order\n`);
    for (const f of failures) {
      console.log(`    #${f.index + 1}: ${f.article.title}`);
      console.log(`    #${f.index + 2}: ${f.nextArticle.title} ← newer than previous\n`);
    }
  }

  console.log('  ACCESSIBILITY AUDIT');
  if (violations.length === 0) {
    console.log('  ✓ No violations found\n');
  } else {
    console.log(`  ⚠ ${violations.length} violations found\n`);
    for (const v of violations) {
      console.log(`  [${v.impact}] ${v.id} — ${v.nodes.length} element(s)`);
      console.log(`    ${v.description}\n`);
    }
  }

  console.log('─────────────────────────────────────────────');
  console.log('  SUMMARY');
  console.log(`  Articles checked:  ${articles.length}`);
  console.log(`  Sort order:        ${failures.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  A11y violations:   ${violations.length}`);
  console.log('─────────────────────────────────────────────\n');
}

/**
 * Prefer system Google Chrome (no extra download). Otherwise use Playwright's Chromium
 * (installed by `npm install` postinstall or `npm run install:browsers`).
 */
async function launchBrowser() {
  const headless =
    process.env.HEADLESS === "1" ||
    process.env.HEADLESS === "true" ||
    process.env.CI === "1";

  if (headless) {
    console.log("[Playwright] Headless mode — no browser window.\n");
  }

  const opts = { headless };
  let chromeError;
  try {
    return await chromium.launch({ ...opts, channel: "chrome" });
  } catch (err) {
    chromeError = err;
  }

  try {
    return await chromium.launch(opts);
  } catch (err) {
    console.error("\n[Playwright] Could not launch Google Chrome:", chromeError?.message || chromeError);
    console.error("[Playwright] Could not launch bundled Chromium:", err.message);
    throw new Error(
      "No browser available. Run once in this folder: npm run install:browsers\n" +
        "(or install Google Chrome and try again.)",
      { cause: err },
    );
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