/**
 * Generate native Android UI designs using Google Stitch SDK.
 * Works around SDK bug where project.generate() fails because
 * outputComponents[0] is designSystem, not design.
 *
 * Usage: STITCH_API_KEY=<key> node scripts/generate-stitch-designs.mjs
 */

import { stitch } from '@google/stitch-sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(import.meta.dirname, '..', 'docs', 'stitch-designs');
mkdirSync(OUTPUT_DIR, { recursive: true });

const PROJECT_ID = process.env.STITCH_PROJECT_ID;

const BRAND = `Brand: electisSpace — ESL (Electronic Shelf Label) management for offices.
Colors: Primary blue (#1976d2), white backgrounds, green (#4caf50) for success/assigned, orange (#ff9800) for warnings/unassigned.
Style: Material Design 3 / Material You, clean professional enterprise Android app. NOT a web app in a shell.
Navigation: Bottom nav bar with 5 tabs (Dashboard, People, Conference, Labels, AIMS).
Font: Inter or system default. RTL support for Hebrew.`;

const screens = [
  {
    name: 'login',
    prompt: `${BRAND}
Native Android login screen:
- electis Space logo centered with Hebrew tagline below
- EN/HE language toggle top-right as segmented button
- Card form: email field (envelope icon), password field (lock + visibility toggle)
- "Trust this device" checkbox with "Skip verification next time" subtitle
- Large blue "Sign In" button
- Biometric fingerprint option at bottom
- Light gradient background (light blue to white), safe area padding`,
  },
  {
    name: 'dashboard',
    prompt: `${BRAND}
Native Android dashboard:
- Top app bar: "Dashboard" title, company/store selector dropdown right, settings gear icon
- Swipeable horizontal card carousel with dot indicators + "1/4" counter:
  Card 1 — Spaces: hero number "142", "Total Spaces" label, progress bar 78% coverage, 3 colored stat tiles row (Assigned:110 green, Unassigned:32 orange, Coverage:78% blue)
  Card 2 — Conference: active rooms count green badge, next meeting info
  Card 3 — People: total count, assigned vs unassigned split bar
  Card 4 — AIMS: connection status dot, last sync time, sync button
- Expandable FAB bottom-right: Add Person, Add Room, Sync Labels
- Bottom nav bar: Dashboard tab active, People, Conference, Labels, AIMS`,
  },
  {
    name: 'people-list',
    prompt: `${BRAND}
Native Android people list:
- App bar: "People" title, search icon, filter icon
- Stats bar: "112 Total • 85 Assigned • 27 Unassigned" with colored dots
- Grouped section list (iOS-style rounded containers):
  Section "Assigned (85)" with green left accent: items show person name, department subtitle, space badge "Office 12-A" right, chevron
  Section "Unassigned (27)" with orange left accent: items show person name, warning icon, no badge
- FAB "+" to add person
- Search expands full-width with filter chips (Department, Status, Space Type)
- Bottom nav: People tab active`,
  },
  {
    name: 'person-edit',
    prompt: `${BRAND}
Native Android person edit/create full page (not dialog):
- Blue app bar: "Edit Person", back arrow left, "Save" text button right
- Scrollable form with rounded card sections:
  "Personal Information" card: Full Name, Employee ID, Department dropdown, Email, Phone — Material Design 3 filled text fields
  "Space Assignment" card: current space "Office 12-A" with "Change" button, space type selector
  "Label Information" card (read-only): linked label code, thumbnail, last sync time
- Red outlined "Delete" button at bottom
- No bottom nav (back arrow to return)`,
  },
  {
    name: 'conference-rooms',
    prompt: `${BRAND}
Native Android conference rooms:
- App bar: "Conference Rooms", search icon
- Summary: "3 of 8 rooms occupied" below app bar
- Filter chips: All, Available, Occupied
- Vertical card list, each room card:
  Room name large, status badge (Available=green, Occupied=red, Upcoming=amber)
  Current meeting: "Team Standup • 10:00-10:30"
  Stacked participant avatar circles with +N overflow
  Color accent left border matching status
- FAB "+" add room
- Bottom nav: Conference tab active`,
  },
  {
    name: 'labels-management',
    prompt: `${BRAND}
Native Android labels (ESL electronic shelf labels) management:
- App bar: "Labels", search icon, filter icon
- Summary bar: "248 Labels • 210 Linked • 38 Unlinked"
- Toggle switch: "Show linked only"
- Card list, each label card:
  Label code "ESL-001" monospace, article ID + name below
  Small thumbnail image right, status: green chain (linked) or grey broken chain (unlinked)
  Quick actions: Link/Unlink button, View Images
- Pagination controls bottom (25/page)
- Speed dial FAB: Link Label, Bulk Assign, Refresh All
- Bottom nav: Labels tab active`,
  },
  {
    name: 'spaces-management',
    prompt: `${BRAND}
Native Android spaces management:
- App bar: "Spaces", search icon, filter icon, list/grid view toggle
- Stats bar: "142 Spaces • 3 Types • 78% Assigned"
- Filter chips: All, Offices, Rooms, Chairs
- Card list, each space card:
  Space ID/number prominent, space type icon (desk/room/chair)
  Assigned person name or "Unassigned" muted grey
  Label status icon (linked chain / not linked)
  Tap to edit
- Grid view: 2-column compact cards
- FAB "+" add space
- Bottom nav`,
  },
  {
    name: 'settings',
    prompt: `${BRAND}
Native Android settings full page:
- Blue app bar: "Settings", back arrow, language switcher (EN|HE)
- Quick actions horizontal row: Edit Profile (person icon), Help (help icon), About (info icon), Logout (red, logout icon)
- Scrollable horizontal tabs: App Settings, SoluM Settings, Logo, Security, Users, Roles, Logs
- App Settings tab content: Theme (Light/Dark/System), Notifications toggle, Offline mode toggle
- Security tab: Change password, 2FA toggle, Trusted devices list
- Bottom: App version "v2.14.0"
- No bottom nav (back arrow returns)`,
  },
  {
    name: 'space-edit',
    prompt: `${BRAND}
Native Android space edit full page:
- Blue app bar: "Edit Space", back arrow, "Save" button right
- Rounded card sections:
  "Space Details": Space ID (read-only edit), Space Type dropdown, dynamic custom fields from article format
  "Person Assignment": assigned person or "None", Assign/Change/Unassign buttons
  "Label": linked label info with preview thumbnail
- Material Design 3 filled inputs with rounded corners
- Red "Delete" button at bottom
- No bottom nav`,
  },
];

async function generateDesigns() {
  // Create project or use existing
  let projectId = PROJECT_ID;
  if (!projectId) {
    const result = await stitch.callTool('create_project', {
      title: 'electisSpace Native Android UI Redesign',
    });
    // Response: { name: "projects/123", ... }
    projectId = result.name.replace('projects/', '');
    console.log(`Created project: ${projectId}`);
  }
  console.log(`Project: ${projectId}\n`);

  const results = [];

  for (const screen of screens) {
    console.log(`Generating: ${screen.name}...`);
    try {
      const raw = await stitch.callTool('generate_screen_from_text', {
        projectId,
        prompt: screen.prompt,
        deviceType: 'MOBILE',
        modelId: 'GEMINI_3_FLASH',
      });

      // Find the design component in outputComponents
      // outputComponents[0] is usually designSystem, [1] has design.screens
      const designComponent = raw.outputComponents?.find(c => c.design?.screens?.length > 0);
      const screenData = designComponent?.design?.screens?.[0];

      if (!screenData) {
        console.log(`  ⚠ No screen data found in response`);
        results.push({ name: screen.name, status: 'no_screen_data' });
        continue;
      }

      console.log(`  Screen ID: ${screenData.id}`);

      // Save HTML from download URL
      if (screenData.htmlCode?.downloadUrl) {
        try {
          const resp = await fetch(screenData.htmlCode.downloadUrl);
          const html = await resp.text();
          writeFileSync(join(OUTPUT_DIR, `${screen.name}.html`), html);
          console.log(`  ✓ HTML saved (${(html.length / 1024).toFixed(1)}KB)`);
        } catch (e) {
          console.log(`  ⚠ HTML download failed: ${e.message}`);
        }
      }

      // Save screenshot from download URL
      if (screenData.screenshot?.downloadUrl) {
        try {
          const resp = await fetch(screenData.screenshot.downloadUrl);
          const buf = Buffer.from(await resp.arrayBuffer());
          writeFileSync(join(OUTPUT_DIR, `${screen.name}.png`), buf);
          console.log(`  ✓ Screenshot saved (${(buf.length / 1024).toFixed(1)}KB)`);
        } catch (e) {
          console.log(`  ⚠ Screenshot download failed: ${e.message}`);
        }
      }

      results.push({
        name: screen.name,
        screenId: screenData.id,
        title: screenData.title,
        status: 'success',
      });
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      results.push({ name: screen.name, status: 'error', error: err.message });
    }
  }

  // Write manifest
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify({
    projectId,
    generatedAt: new Date().toISOString(),
    screens: results,
  }, null, 2));

  console.log('\n--- Summary ---');
  const ok = results.filter(r => r.status === 'success').length;
  const fail = results.filter(r => r.status !== 'success').length;
  console.log(`Project: ${projectId}`);
  console.log(`Success: ${ok} | Failed: ${fail}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

generateDesigns().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
