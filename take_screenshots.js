const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SCREENSHOT_DIR = path.join(__dirname, 'public', 'images', 'screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 1. Login page
    console.log('📸 Login page...');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login.png'), fullPage: false });

    // 2. Log in
    console.log('🔐 Logging in...');
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // 3. Programs page
    console.log('📸 Programs page...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-programs.png'), fullPage: true });

    // Find first program link to navigate to dashboard
    const programLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/admin/p/"]'));
      const dashboardLink = links.find(l => l.href.includes('/dashboard'));
      return dashboardLink ? dashboardLink.href : null;
    });

    if (!programLink) {
      console.log('⚠️  No programs found. Taking what we can...');
      await browser.close();
      return;
    }

    // 4. Program Dashboard
    console.log('📸 Program Dashboard...');
    await page.goto(programLink, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard.png'), fullPage: false });

    // 5. Dashboard - scroll to submissions
    console.log('📸 Submissions table...');
    const submissionsSection = await page.$('h2, h3');
    if (submissionsSection) {
      await submissionsSection.scrollIntoView();
      await delay(300);
    }
    await page.evaluate(() => window.scrollTo(0, 400));
    await delay(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-submissions.png'), fullPage: false });

    // 5b. Dashboard - scroll to workshops section
    console.log('📸 Workshops section...');
    const workshopsHeader = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('h3'));
      const wsHeader = headers.find(h => h.textContent.includes('Workshops'));
      if (wsHeader) {
        wsHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
        return true;
      }
      return false;
    });
    if (workshopsHeader) {
      await delay(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05a-workshops.png'), fullPage: false });
    }

    // 6. Dashboard - scroll to magic links
    console.log('📸 Magic links section...');
    const magicLinksHeader = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('h2, h3, h4'));
      const mlHeader = headers.find(h => h.textContent.includes('External') || h.textContent.includes('Magic') || h.textContent.includes('Scheduling Links'));
      if (mlHeader) {
        mlHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
        return true;
      }
      return false;
    });
    if (magicLinksHeader) {
      await delay(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-magic-links.png'), fullPage: false });
    }

    // 7. Try to open Create New Link modal
    console.log('📸 Create link modal...');
    const createLinkBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Create New Link') || b.textContent.includes('Create Link'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (createLinkBtn) {
      await delay(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-create-link-modal.png'), fullPage: false });
      // Close modal
      await page.keyboard.press('Escape');
      await delay(300);
    }

    // 8. Navigate to scheduling page (use program-scoped URL)
    const schedulingLink = await page.evaluate(() => {
      // Look for "Schedule Talks" button or program-scoped scheduling link
      const links = Array.from(document.querySelectorAll('a[href*="/admin/p/"]'));
      const schedLink = links.find(l => l.href.includes('/scheduling'));
      return schedLink ? schedLink.href : null;
    });

    if (schedulingLink) {
      console.log('📸 Scheduling page...');
      await page.goto(schedulingLink, { waitUntil: 'networkidle0' });
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-scheduling.png'), fullPage: false });

      // 9. Unscheduled sidebar
      console.log('📸 Unscheduled talks sidebar...');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-unscheduled-sidebar.png'), fullPage: false });

      // 10. Try Add Event tab
      console.log('📸 Add Event tab...');
      const addEventTab = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[data-tab], .tab, button, a'));
        const tab = tabs.find(t => t.textContent.includes('Add Event') || t.textContent.includes('Event'));
        if (tab) { tab.click(); return true; }
        return false;
      });
      if (addEventTab) {
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-add-event.png'), fullPage: false });
      }

      // 11. Try Add Block tab
      console.log('📸 Add Block tab...');
      const addBlockTab = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[data-tab], .tab, button, a'));
        const tab = tabs.find(t => t.textContent.includes('Add Block') || t.textContent.includes('Block'));
        if (tab) { tab.click(); return true; }
        return false;
      });
      if (addBlockTab) {
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-add-block.png'), fullPage: false });
      }

      // 12. Export buttons area (top of page)
      console.log('📸 Export buttons...');
      await page.evaluate(() => window.scrollTo(0, 0));
      await delay(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-export-buttons.png'), fullPage: false });

      // 13. Try clicking on a scheduled talk to show edit modal
      console.log('📸 Edit talk modal...');
      const clickedTalk = await page.evaluate(() => {
        const talks = document.querySelectorAll('.scheduled-talk, .talk-card, .event-card, [data-talk-id]');
        if (talks.length > 0) { talks[0].click(); return true; }
        return false;
      });
      if (clickedTalk) {
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-edit-talk.png'), fullPage: false });
      }
    }

    // --- Public pages (no login needed) ---

    // 13. Program listing (public)
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1400, height: 900 });

    console.log('📸 Public program listing...');
    await page2.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '13-program-listing.png'), fullPage: false });

    // 14. Find a registration link and take screenshot
    const registerLink = await page2.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="register"]'));
      return links.length > 0 ? links[0].href : null;
    });

    if (registerLink) {
      console.log('📸 Registration form...');
      await page2.goto(registerLink, { waitUntil: 'networkidle0' });
      await delay(500);
      await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '14-registration-form.png'), fullPage: true });
    }

    await page2.close();

    console.log('\n✅ Screenshots saved to public/images/screenshots/');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
