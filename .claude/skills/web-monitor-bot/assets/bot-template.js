require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { IncomingWebhook } = require('@slack/webhook');
const fs = require('fs');
const path = require('path');

// Enable stealth mode for anti-detection
chromium.use(stealth);

const webhook = process.env.SLACK_WEBHOOK_URL ? new IncomingWebhook(process.env.SLACK_WEBHOOK_URL) : null;
const COOKIES_FILE = path.join(__dirname, 'session-cookies.json');
const LOCK_FILE = '/tmp/web-monitor.lock';
const LOCK_TIMEOUT_MS = 180000; // 3 minutes
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
const CLOUDFLARE_BLOCKS_FILE = path.join(__dirname, 'cloudflare-blocks.json');

// Console-only log (no notifications)
function consoleLog(message) {
  console.log(message);
}

// Critical alerts - send to notification service AND console
async function log(message) {
  console.log(message);
  if (webhook) {
    try {
      await webhook.send({ text: message });
    } catch (e) {
      console.error('Notification error:', e.message);
    }
  }
}

// Analytics logging
function logAnalytics(data) {
  try {
    let analytics = [];
    if (fs.existsSync(ANALYTICS_FILE)) {
      const content = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      if (content.trim()) {
        analytics = JSON.parse(content);
      }
    }
    analytics.push(data);
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
  } catch (e) {
    console.error('Analytics logging error:', e.message);
  }
}

async function saveCookies(context) {
  const cookies = await context.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  consoleLog('💾 Saved session');
}

async function loadCookies(context) {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    await context.addCookies(cookies);
    return true;
  }
  return false;
}

function checkLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const stats = fs.statSync(LOCK_FILE);
    const lockAge = Date.now() - stats.mtimeMs;

    if (lockAge < LOCK_TIMEOUT_MS) {
      console.log('🔒 Another instance is running. Exiting.');
      process.exit(0);
    } else {
      console.log('⚠️  Removing stale lock file');
      fs.unlinkSync(LOCK_FILE);
    }
  }
}

function createLock() {
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
}

function removeLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

// ============================================================================
// Anti-Detection Utilities (Production-Tested)
// ============================================================================

/**
 * Generate random delay for human-like timing
 */
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Click with human-like mouse movement
 */
async function humanClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  const element = await page.locator(selector);
  const box = await element.boundingBox();

  if (!box) throw new Error(`Element not visible: ${selector}`);

  // Random position within element
  const x = box.x + randomDelay(5, Math.max(box.width - 5, 5));
  const y = box.y + randomDelay(5, Math.max(box.height - 5, 5));

  // Move cursor with random steps (curved path)
  await page.mouse.move(x, y, { steps: randomDelay(10, 30) });
  await page.waitForTimeout(randomDelay(100, 300));
  await page.mouse.click(x, y);
}

/**
 * Track Cloudflare blocks
 */
function getCloudflareBlocks() {
  try {
    if (fs.existsSync(CLOUDFLARE_BLOCKS_FILE)) {
      const content = fs.readFileSync(CLOUDFLARE_BLOCKS_FILE, 'utf-8');
      return content.trim() ? JSON.parse(content) : { consecutive: 0, total: 0, history: [] };
    }
  } catch (error) {
    console.error('Error reading Cloudflare blocks:', error.message);
  }
  return { consecutive: 0, total: 0, history: [] };
}

function logCloudflareBlock(blocked) {
  try {
    const blocks = getCloudflareBlocks();

    if (blocked) {
      blocks.consecutive += 1;
      blocks.total += 1;
      blocks.history.push({ timestamp: new Date().toISOString(), blocked: true });
    } else {
      blocks.consecutive = 0;
      blocks.history.push({ timestamp: new Date().toISOString(), blocked: false });
    }

    if (blocks.history.length > 100) blocks.history = blocks.history.slice(-100);

    fs.writeFileSync(CLOUDFLARE_BLOCKS_FILE, JSON.stringify(blocks, null, 2));
    return blocks;
  } catch (error) {
    console.error('Error logging Cloudflare block:', error.message);
    return { consecutive: 0, total: 0, history: [] };
  }
}

/**
 * Detect and handle Cloudflare challenges with smart polling
 */
async function detectCloudflare(page, context, location = 'page load') {
  consoleLog(`🔍 Checking for Cloudflare challenge (${location})...`);

  const cloudflareDetected =
    await page.locator('text=Verify you are human').count() > 0 ||
    await page.locator('[name="cf-turnstile-response"]').count() > 0 ||
    await page.locator('.cf-turnstile').count() > 0 ||
    await page.locator('text=Verifying you are human').count() > 0;

  if (!cloudflareDetected) {
    logCloudflareBlock(false);
    return false;
  }

  // Cloudflare detected!
  const newBlocks = logCloudflareBlock(true);
  await log(`🤖 ALERT: Cloudflare challenge detected at ${location}! (Consecutive: ${newBlocks.consecutive}, Total: ${newBlocks.total})`);
  await page.screenshot({ path: path.join(__dirname, 'cloudflare-detected.png') });

  if (newBlocks.consecutive >= 3) {
    await log(`⚠️ WARNING: ${newBlocks.consecutive} consecutive Cloudflare blocks! Session may be flagged.`);
  }

  // Poll every 10s for 90s
  consoleLog('⏳ Waiting up to 90s for Cloudflare challenge to auto-solve...');
  const maxIterations = 9;

  for (let i = 0; i < maxIterations; i++) {
    await page.waitForTimeout(10000);

    const stillBlocked =
      await page.locator('text=Verify you are human').count() > 0 ||
      await page.locator('[name="cf-turnstile-response"]').count() > 0 ||
      await page.locator('.cf-turnstile').count() > 0 ||
      await page.locator('text=Verifying you are human').count() > 0;

    if (!stillBlocked) {
      consoleLog('✅ Cloudflare challenge auto-solved!');
      await page.screenshot({ path: path.join(__dirname, 'cloudflare-cleared.png') });
      await saveCookies(context); // Save immediately
      return true;
    }

    if ((i + 1) % 3 === 0) {
      const elapsed = (i + 1) * 10;
      consoleLog(`⏳ Still waiting... (${elapsed}s / 90s elapsed)`);
    }
  }

  await log(`❌ ALERT: Cloudflare challenge not solved after 90s. Aborting run.`);
  await page.screenshot({ path: path.join(__dirname, 'cloudflare-timeout.png') });
  throw new Error('Cloudflare challenge not solved after 90s wait');
}

// ============================================================================

async function monitorWebsite() {
  checkLock();
  createLock();

  const now = new Date();
  const isPeakWindow = false; // TODO: Configure peak detection logic

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    const targetUrl = process.env.TARGET_URL;

    // Try to load saved cookies
    const hasCookies = await loadCookies(context);

    if (hasCookies) {
      consoleLog('🔑 Using saved session...');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Random delay after page load (human-like)
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Check for Cloudflare after page load
      await detectCloudflare(page, context, 'saved session load');
    } else {
      // TODO: Add login logic if needed
      consoleLog('🏠 Navigating to ' + targetUrl);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Random delay after page load (human-like)
      await page.waitForTimeout(randomDelay(1500, 2500));

      // Check for Cloudflare on initial load
      await detectCloudflare(page, context, 'initial load');
    }

    // TODO: Customize detection logic
    await checkAvailability(page, isPeakWindow, context);

  } catch (e) {
    await log(`❌ ALERT: Error occurred - ${e.message}`);
    console.error(e);
  } finally {
    await browser.close();
    removeLock();
  }
}

async function checkAvailability(page, isPeakWindow, context) {
  consoleLog('🔍 Checking for changes...');

  // Check Cloudflare block status for analytics
  const blockData = getCloudflareBlocks();
  const wasBlockedThisRun = blockData.history.length > 0 &&
                            blockData.history[blockData.history.length - 1].blocked;

  const analyticsData = {
    timestamp: new Date().toISOString(),
    isPeakWindow,
    cloudflareBlocked: wasBlockedThisRun,
    foundMatch: false,
    data: {}
  };

  // TODO: Customize selector logic for your use case
  const selector = process.env.TARGET_SELECTOR || 'body';

  try {
    await page.waitForSelector(selector, { state: 'attached', timeout: 10000 });

    // TODO: Add custom detection logic here
    // Examples:
    // - Check if element exists: await page.locator('.available-button').count() > 0
    // - Extract text: const text = await page.textContent('.status')
    // - Click with human-like behavior: await humanClick(page, '.check-button')
    // - Add random delays: await page.waitForTimeout(randomDelay(500, 1500))

    consoleLog('✅ Page loaded successfully');
    analyticsData.foundMatch = false; // Update based on your logic

  } catch (e) {
    await log(`❌ ALERT: Failed to find selector: ${selector}`);
    throw e;
  }

  logAnalytics(analyticsData);
}

// Ensure lock is removed on any exit
process.on('SIGINT', () => {
  removeLock();
  process.exit();
});

process.on('SIGTERM', () => {
  removeLock();
  process.exit();
});

monitorWebsite().catch(e => {
  console.error(e);
  removeLock();
  process.exit(1);
});
