import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: [
    '*://*.ign.com/*',
    '*://*.kotaku.com/*',
    '*://*.butwhytho.net/*',
    '*://*.player2.net.au/*',
    '*://*.pcgamer.com/*',
    '*://*.wccftech.com/*',
    '*://*.mmorpg.com/*',
    '*://*.gamingtrend.com/*',
    '*://*.windowscentral.com/*',
    '*://*.dotesports.com/*',
    '*://*.gamecritics.com/*',
    '*://*.polygon.com/*',
    '*://*.digitaltrends.com/*',
    '*://*.gamesradar.com/*',
  ],
  permissions: ['storage', 'tabs'],
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: [
        '*://*.ign.com/*',
        '*://*.kotaku.com/*',
        '*://*.butwhytho.net/*',
        '*://*.player2.net.au/*',
        '*://*.pcgamer.com/*',
        '*://*.wccftech.com/*',
        '*://*.mmorpg.com/*',
        '*://*.gamingtrend.com/*',
        '*://*.windowscentral.com/*',
        '*://*.dotesports.com/*',
        '*://*.gamecritics.com/*',
        '*://*.polygon.com/*',
        '*://*.digitaltrends.com/*',
        '*://*.gamesradar.com/*',
      ],
      run_at: 'document_start',
      js: ['content/index.iife.js', 'content/index.iife_dev.js'],
    },
    {
      matches: [
        '*://*.ign.com/*',
        '*://*.kotaku.com/*',
        '*://*.butwhytho.net/*',
        '*://*.player2.net.au/*',
        '*://*.pcgamer.com/*',
        '*://*.wccftech.com/*',
        '*://*.mmorpg.com/*',
        '*://*.gamingtrend.com/*',
        '*://*.windowscentral.com/*',
        '*://*.dotesports.com/*',
        '*://*.gamecritics.com/*',
        '*://*.polygon.com/*',
        '*://*.digitaltrends.com/*',
        '*://*.gamesradar.com/*',
      ],
      js: ['content-ui/index.iife.js'],
    },
    {
      matches: [
        '*://*.ign.com/*',
        '*://*.kotaku.com/*',
        '*://*.butwhytho.net/*',
        '*://*.player2.net.au/*',
        '*://*.pcgamer.com/*',
        '*://*.wccftech.com/*',
        '*://*.mmorpg.com/*',
        '*://*.gamingtrend.com/*',
        '*://*.windowscentral.com/*',
        '*://*.dotesports.com/*',
        '*://*.gamecritics.com/*',
        '*://*.polygon.com/*',
        '*://*.digitaltrends.com/*',
        '*://*.gamesradar.com/*',
      ],
      js: ['content-ui/index.iife_dev.js'],
    },
  ],
} satisfies chrome.runtime.ManifestV3;

export default manifest;
