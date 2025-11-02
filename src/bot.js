require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { IncomingWebhook } = require('@slack/webhook');
const fs = require('fs');
const path = require('path');

// Enable stealth mode to bypass bot detection
chromium.use(stealth);

const webhook = process.env.SLACK_WEBHOOK_URL ? new IncomingWebhook(process.env.SLACK_WEBHOOK_URL) : null;
const DATA_DIR = path.join(__dirname, '..', 'data');
const COOKIES_FILE = path.join(DATA_DIR, 'tock-cookies.json');
const LOCK_FILE = '/tmp/tockstalk.lock';
const LOCK_TIMEOUT_MS = 180000; // 3 minutes
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const CLOUDFLARE_BLOCKS_FILE = path.join(DATA_DIR, 'cloudflare-blocks.json');

// Console-only log (no Slack)
function consoleLog(message) {
  console.log(message);
}

// Critical alerts - send to Slack AND console
async function log(message) {
  console.log(message);
  if (webhook) {
    try {
      await webhook.send({ text: message });
    } catch (e) {
      console.error('Slack error:', e.message);
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

// Cloudflare block tracking
function getCloudflareBlocks() {
  try {
    if (fs.existsSync(CLOUDFLARE_BLOCKS_FILE)) {
      const content = fs.readFileSync(CLOUDFLARE_BLOCKS_FILE, 'utf-8');
      return content.trim() ? JSON.parse(content) : { consecutive: 0, total: 0, history: [] };
    }
  } catch (e) {
    console.error('Error reading Cloudflare blocks:', e.message);
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
      // Reset consecutive on success
      blocks.consecutive = 0;
      blocks.history.push({ timestamp: new Date().toISOString(), blocked: false });
    }

    // Keep only last 100 history entries
    if (blocks.history.length > 100) {
      blocks.history = blocks.history.slice(-100);
    }

    fs.writeFileSync(CLOUDFLARE_BLOCKS_FILE, JSON.stringify(blocks, null, 2));
    return blocks;
  } catch (e) {
    console.error('Error logging Cloudflare block:', e.message);
    return { consecutive: 0, total: 0, history: [] };
  }
}

async function saveCookies(context) {
  const cookies = await context.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  consoleLog('💾 Saved login session');
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

// Detect and handle Cloudflare challenges
async function detectCloudflare(page, browserContext, location = 'page load') {
  consoleLog(`🔍 Checking for Cloudflare challenge (${location})...`);

  // Check for Cloudflare challenge indicators
  const cloudflareDetected = await page.locator('text=Verify you are human').count() > 0 ||
                             await page.locator('[name="cf-turnstile-response"]').count() > 0 ||
                             await page.locator('.cf-turnstile').count() > 0 ||
                             await page.locator('text=Verifying you are human').count() > 0;

  if (!cloudflareDetected) {
    // No challenge detected - log success
    logCloudflareBlock(false);
    return false;
  }

  // Cloudflare challenge detected!
  const blocks = getCloudflareBlocks();
  const newBlocks = logCloudflareBlock(true);

  await log(`🤖 ALERT: Cloudflare challenge detected at ${location}! (Consecutive blocks: ${newBlocks.consecutive}, Total: ${newBlocks.total})`);
  await page.screenshot({ path: path.join(DATA_DIR, 'cloudflare-detected.png') });

  // Alert if we have 3+ consecutive blocks (something is wrong)
  if (newBlocks.consecutive >= 3) {
    await log(`⚠️ WARNING: ${newBlocks.consecutive} consecutive Cloudflare blocks! Session may be flagged.`);
  }

  // Wait for Cloudflare to auto-solve - poll every 10 seconds for 150 seconds
  consoleLog('⏳ Waiting up to 150s for Cloudflare challenge to auto-solve...');
  const maxIterations = 15;
  for (let i = 0; i < maxIterations; i++) {
    await page.waitForTimeout(10000); // Wait 10 seconds

    // Check if challenge cleared
    const stillBlocked = await page.locator('text=Verify you are human').count() > 0 ||
                         await page.locator('[name="cf-turnstile-response"]').count() > 0 ||
                         await page.locator('.cf-turnstile').count() > 0 ||
                         await page.locator('text=Verifying you are human').count() > 0;

    if (!stillBlocked) {
      // Challenge auto-solved!
      consoleLog('✅ Cloudflare challenge auto-solved!');
      await log('✅ Cloudflare challenge auto-solved! Saving session...');

      // Screenshot after it clears (for debugging)
      await page.screenshot({ path: path.join(DATA_DIR, 'cloudflare-cleared.png') });

      // Save cookies immediately
      await saveCookies(browserContext);

      return true;
    }

    // Progress update every 30 seconds (every 3 iterations)
    if ((i + 1) % 3 === 0) {
      const elapsed = (i + 1) * 10;
      consoleLog(`⏳ Still waiting... (${elapsed}s / 150s elapsed)`);
    }
  }

  // Timeout after 150 seconds
  await log(`❌ ALERT: Cloudflare challenge not solved after 150s wait. Aborting run.`);
  await page.screenshot({ path: path.join(DATA_DIR, 'cloudflare-timeout.png') });
  throw new Error('Cloudflare challenge not solved after 150s wait');
}

async function bookReservation() {
  // Check for existing lock
  checkLock();
  createLock();

  // Check if this is peak window time
  // Peak #1: 4:59pm PT = 12:59am UTC next day (0:59)
  // Peak #2: 5:59pm PT = 1:59am UTC next day (1:59)
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const isPeakWindow = (hour === 0 && minute === 59) || // 4:59pm PT peak
                       (hour === 1 && minute === 59); // 5:59pm PT peak

  // Peak-aware timeouts: 60s during peak, 30s otherwise
  const gotoTimeout = isPeakWindow ? 60000 : 30000;
  const reloadTimeout = isPeakWindow ? 60000 : 30000;

  if (isPeakWindow) {
    const peakTime = hour === 0 ? '4:59pm PT' : '5:59pm PT';
    await log(`🚨 PEAK WINDOW CHECK - Checking ${peakTime} release! 🚨`);
  }

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    const bookingPage = process.env.BOOKING_PAGE;
    const partySize = process.env.PARTY_SIZE;
    const desiredTimes = process.env.DESIRED_TIME_SLOTS.split(',');
    const dryRun = process.env.DRY_RUN === 'true';

    // Try to load saved cookies
    const hasCookies = await loadCookies(context);

    if (hasCookies) {
      consoleLog('🔑 Using saved session...');

      // Go directly to booking page
      await page.goto(`https://www.exploretock.com${bookingPage}?size=${partySize}`, {
        waitUntil: 'domcontentloaded',
        timeout: gotoTimeout
      });

      await page.waitForTimeout(1500); // Reduced from 3000ms

      // Check for Cloudflare challenge after initial page load
      await detectCloudflare(page, context, 'saved session - initial load');

      // Check if we're still logged in
      if (page.url().includes('login')) {
        consoleLog('🔄 Session expired, logging in again...');
        // Fall through to login
      } else {
        consoleLog('✅ Session valid, already on booking page!');
        // Refresh the page to ensure calendar is loaded
        await page.reload({ waitUntil: 'domcontentloaded', timeout: reloadTimeout });
        await page.waitForTimeout(1000); // Reduced from 2000ms

        // Check for Cloudflare challenge after reload
        await detectCloudflare(page, context, 'saved session - after reload');

        // Skip to availability check
        await checkAvailability(page, desiredTimes, dryRun, context);
        return;
      }
    }

    // Need to login
    consoleLog('🏠 Navigating to Tock...');
    const redirectUrl = encodeURIComponent(`${bookingPage}?size=${partySize}`);
    await page.goto(`https://www.exploretock.com/login?continue=${redirectUrl}`, {
      waitUntil: 'domcontentloaded',
      timeout: gotoTimeout
    });

    await page.waitForTimeout(3000);

    // Check for Cloudflare challenge after login page load
    await detectCloudflare(page, context, 'login page');

    consoleLog('🔓 Logging in...');
    await page.fill('[data-testid="email-input"]', process.env.TOCK_EMAIL);
    await page.fill('[data-testid="password-input"]', process.env.TOCK_PASSWORD);
    await page.click('[data-testid="signin"]');

    await page.waitForTimeout(5000);

    if (page.url().includes('login')) {
      await log('❌ ALERT: Login failed');
      return false;
    }

    consoleLog('✅ Login successful!');

    // Save cookies for next time
    await saveCookies(context);

    await page.waitForTimeout(2000);

    // Check availability
    await checkAvailability(page, desiredTimes, dryRun, context);

  } catch (error) {
    await log(`❌ Error: ${error.message}`);
    await page.screenshot({ path: path.join(DATA_DIR, 'error.png') });
    return false;
  } finally {
    await browser.close();
    removeLock();
  }
}

async function checkAvailability(page, desiredTimes, dryRun, context) {
  consoleLog('🔍 Checking for available days...');

  // Detect peak window for longer timeout
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const isPeakWindow = (hour === 0 && minute === 59) || // 4:59pm PT peak
                       (hour === 1 && minute === 59); // 5:59pm PT peak
  const timeout = isPeakWindow ? 60000 : 30000;

  // Wait for calendar to load with retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      await page.waitForSelector('[data-testid="consumer-calendar-day"]', { state: 'attached', timeout });
      break;
    } catch (e) {
      retries--;
      if (retries === 0) {
        // Final failure - send to Slack
        await log(`❌ ALERT: Calendar failed to load after 3 attempts (${isPeakWindow ? 'PEAK WINDOW' : 'off-peak'})`);
        await page.screenshot({ path: path.join(DATA_DIR, 'calendar-timeout.png') });
        throw e;
      }
      // Intermediate retry - console only, no Slack spam
      console.log(`⏳ Calendar not loaded, retrying... (${retries} attempts left)`);
      await page.reload({ waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(3000);
    }
  }

  await page.waitForTimeout(2000);

  // Find available days
  const availableDays = await page.$$('[data-testid="consumer-calendar-day"][aria-disabled="false"].is-available');

  // Check Cloudflare block status
  const blockData = getCloudflareBlocks();
  const wasBlockedThisRun = blockData.history.length > 0 &&
                            blockData.history[blockData.history.length - 1].blocked;

  // Analytics data structure
  const analyticsData = {
    timestamp: new Date().toISOString(),
    isPeakWindow,
    cloudflareBlocked: wasBlockedThisRun,
    totalAvailableDays: availableDays.length,
    availableDays: [],
    totalTimeSlots: 0
  };

  if (availableDays.length === 0) {
    consoleLog('😢 No available days found');
    logAnalytics(analyticsData);
    return false;
  }

  // First availability detection - alert on Slack
  consoleLog(`🙌 Found ${availableDays.length} available days`);
  await log(`🚨 AVAILABILITY DETECTED: ${availableDays.length} days have slots!`);

  // Check each day for desired time slots
  for (let i = 0; i < availableDays.length; i++) {
    const day = availableDays[i];
    const dateLabel = await day.getAttribute('aria-label');

    consoleLog(`📅 Checking ${dateLabel}...`);
    await day.click();
    await page.waitForTimeout(800); // Reduced from 1500ms for faster checking

    // Get time slots
    const timeSlots = await page.$$('[data-testid="search-result-time"] span');
    consoleLog(`   Found ${timeSlots.length} time slots`);

    // Collect time slot data for analytics
    const daySlots = [];
    for (const slot of timeSlots) {
      const timeText = await slot.textContent();
      const trimmedTime = timeText.trim();
      daySlots.push(trimmedTime);
    }

    analyticsData.availableDays.push({
      date: dateLabel,
      timeSlots: daySlots
    });
    analyticsData.totalTimeSlots += daySlots.length;

    for (const slot of timeSlots) {
      const timeText = await slot.textContent();
      const trimmedTime = timeText.trim();

      if (desiredTimes.includes(trimmedTime)) {
        await log(`🎯 MATCHED DESIRED TIME: ${trimmedTime} on ${dateLabel}!`);
        analyticsData.matchedSlot = { date: dateLabel, time: trimmedTime };
        logAnalytics(analyticsData);

        if (dryRun) {
          await log('🧪 DRY RUN MODE - Would book now!');
          await page.screenshot({ path: path.join(DATA_DIR, 'would-book.png') });
          return true;
        }

        // Click the time slot
        await slot.click();
        await page.waitForTimeout(1500); // Reduced from 3000ms

        // Check for Cloudflare challenge
        const cloudflareDetected = await page.locator('text=Verify you are human').count() > 0 ||
                                   await page.locator('[name="cf-turnstile-response"]').count() > 0 ||
                                   await page.locator('.cf-turnstile').count() > 0;

        if (cloudflareDetected) {
          await log('🤖 ALERT: Cloudflare challenge detected! Manual intervention needed!');
          await page.screenshot({ path: path.join(DATA_DIR, 'cloudflare-challenge.png') });

          // Wait up to 150 seconds for manual solving
          consoleLog('⏳ Waiting 150s for manual Cloudflare solve...');
          await page.waitForTimeout(150000);

          // Check if still blocked
          const stillBlocked = await page.locator('text=Verify you are human').count() > 0;
          if (stillBlocked) {
            await log('❌ Cloudflare challenge not solved, aborting.');
            return false;
          }
          consoleLog('✅ Cloudflare challenge passed!');
        }

        // Check for CVV field
        try {
          const cvvFrame = page.frameLocator('iframe[type="cvv"]');
          const cvvInput = cvvFrame.locator('#cvv');

          if (await cvvInput.count() > 0) {
            consoleLog('💳 Entering CVV...');
            await cvvInput.fill(process.env.TOCK_CVV);
            await page.waitForTimeout(500); // Reduced from 1000ms
          }
        } catch (e) {
          consoleLog('💸 No CVV required');
        }

        // Check for "Notify" modal (slot already taken)
        const notifyModal = await page.locator('text=Set Notify').count() > 0;
        if (notifyModal) {
          consoleLog('⚠️  Slot already taken, trying next slot...');
          await page.keyboard.press('Escape'); // Close modal
          await page.waitForTimeout(500);
          continue; // Try next time slot
        }

        // Click purchase button
        consoleLog('🎯 Submitting reservation...');
        await page.click('[data-testid="purchase-button"]', { timeout: 10000 });

        // Wait for confirmation
        await page.waitForSelector('[data-testid="receipt-confirmation-id"]', { timeout: 15000 });
        const confirmationId = await page.textContent('[data-testid="receipt-confirmation-id"]');

        await log(`🎉 SUCCESS! Booked ${dateLabel} at ${trimmedTime}!`);
        await log(`📋 Confirmation: ${confirmationId}`);
        await page.screenshot({ path: path.join(DATA_DIR, 'success.png') });

        // Stop the cron jobs after successful booking
        await log('🛑 Stopping bot - disabling cron jobs...');
        require('child_process').execSync(path.join(__dirname, '..', 'scripts', 'stop-bot.sh'));
        await log('✅ Bot stopped successfully!');

        // Delete cookies file
        if (fs.existsSync(COOKIES_FILE)) {
          fs.unlinkSync(COOKIES_FILE);
        }

        return true;
      }
    }
  }

  consoleLog('😢 No matching time slots found');
  logAnalytics(analyticsData);
  return false;
}

// Ensure lock is removed on any exit
process.on('SIGINT', () => {
  removeLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  removeLock();
  process.exit(0);
});

bookReservation().then(success => {
  process.exit(success ? 0 : 1);
});
