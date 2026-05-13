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

/** Prefer installed Chrome (matches CPU arch on Apple Silicon); fallback to bundled Chromium. */
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

  console.log(`collected ${articles.length} articles`);
  console.log(articles[0]);
  console.log(articles[99]);

  const failures = validateOrder(articles);

  if (failures.length === 0) {
    console.log('PASS — all 100 articles are sorted newest to oldest');
  } else {
    console.log(`FAIL — ${failures.length} articles out of order`);
    for (const f of failures) {
      console.log(`  #${f.index + 1}: ${f.article.title} — ${f.article.datetime}`);
      console.log(`  #${f.index + 2}: ${f.nextArticle.title} — ${f.nextArticle.datetime}`);
    }
  }

  const violations = await accessibilityAudit(page);

  console.log(`\nAccessibility audit — ${violations.length} violations found`);
  for (const v of violations) {
    console.log(`  [${v.impact}] ${v.id} — ${v.nodes.length} element(s)`);
  }

  await browser.close();
}

(async () => {
  await sortHackerNewsArticles();
})();