import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json' with { type: 'json' };

/**
 * Manifest V3 for Firefox. No remote code, no remote fonts, no analytics, and
 * the only host the extension talks to is the record service: fetching public
 * records by id without credentials, creating sign orders, and, when the
 * reader opts in, sighting reports. `<all_urls>` for the content script is
 * what "verify a Mark on any page" costs; the script reads text nodes and
 * draws badges and sends nothing about the page anywhere.
 *
 * Where Firefox differs from Chrome: the background is an event page under
 * background.scripts (Firefox runs no extension service workers), the add-on
 * carries its id, its minimum version and its data collection declaration
 * under browser_specific_settings. Firefox has granted the manifest's host
 * permissions at install since 127 and shown the data declaration since 140.
 */
export default defineManifest((env) => ({
  manifest_version: 3,
  name: 'ZOREAL Mark',
  short_name: 'ZOREAL Mark',
  // One version, in package.json: `npm version` moves it and the release
  // workflow tags it.
  version: pkg.version,
  description: 'Verify that a real human, verified by ZOREAL, vouched for what you are reading. Sign what you post. Works on any site.',
  browser_specific_settings: {
    gecko: {
      id: 'mark@zoreal.com',
      // 140 is where Firefox began showing the data collection declaration
      // below at install; it is also the current extended-support release.
      strict_min_version: '140.0',
      // What the extension sends, declared the way Firefox shows it at
      // install. Verifying sends nothing about the reader. Signing, and only
      // signing, sends the text the user chose to sign (sealed so the record
      // service cannot read it) and the address of the page it is for.
      data_collection_permissions: { required: ['websiteContent', 'browsingActivity'] },
    },
    // No Android listing yet; the floor is where Android Firefox learned the
    // declaration above, so the same manifest serves when there is one.
    gecko_android: { strict_min_version: '142.0' },
  },
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'ZOREAL Mark',
    default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' },
  },
  options_ui: { page: 'src/options/index.html', open_in_tab: true },
  // Firefox: an event page. The file keeps its name so the code stays the
  // same as the Chrome build's; it is a module either way.
  background: { scripts: ['src/background/service-worker.ts'], type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
      // Frames too: a dashboard that embeds its editor in an iframe, a chat
      // widget, a comment box served from another origin. Each frame scans
      // itself and answers for its own boxes; the worker remembers which frame
      // last held the cursor so the popup asks the right one.
      all_frames: true,
    },
  ],
  // No activeTab: the host permission below already lets the popup see the
  // current tab's URL and message its content script, so activeTab would be
  // a grant that adds nothing, and the store rejects those.
  permissions: ['storage', 'contextMenus', 'scripting', 'alarms'],
  // Every page, the same grant the content script above already implies, so
  // that after an extension reload the script can be put back into the tabs
  // that are already open, and so the worker can see a tab's URL when a Mark
  // sits inside a frame on any site. The record service hosts stay listed
  // for the CSP connect-src below.
  host_permissions: ['<all_urls>'],
  web_accessible_resources: [
    { resources: ['fonts/*', 'icons/*'], matches: ['<all_urls>'] },
  ],
  content_security_policy: {
    // A release talks to the record service and nothing else. A development
    // build (`npm run build:local`, `npm run dev`) may also reach a record
    // service on this machine: the mock on 4820 and a local API on 3000.
    extension_pages: `script-src 'self'; object-src 'self'; connect-src https://mark.zoreal.com https://api.zoreal.com${env.mode === 'production' ? '' : ' http://localhost:4820 http://localhost:3000'}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`,
  },
}));
