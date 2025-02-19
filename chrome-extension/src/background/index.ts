// background.js

// Import initial filtered authors data
// Adjust the import path as needed based on your project structure
import { filteredAuthors as initialFilteredAuthors } from './data/filteredAuthors';
import type { SiteConfig } from './data/filteredAuthors';
// Store per-tab blocked counts
const perTabBlockedCounts: { [key: number]: number } = {};

interface authorPreferences {
  [siteAuthorKey: string]: boolean;
}

// Function to update authorPreferences for DEI authors when enableDEIFiltering is enabled
function updateDEIAuthorPreferences(
  filteredAuthorsData: SiteConfig[],
  authorPreferences: authorPreferences,
  //deiAuthorsBackup,
) {
  const updatedAuthorPreferences = { ...authorPreferences };
  //const updatedDEIAuthorsBackup = { ...deiAuthorsBackup };

  filteredAuthorsData.forEach(siteConfig => {
    const siteKey = siteConfig.siteKey;
    siteConfig.authors.forEach(author => {
      if (author.dei === true) {
        const authorPrefKey = `${siteKey}:${author.name}`;

        // Check if the author is already in authorPreferences
        if (!Object.prototype.hasOwnProperty.call(authorPreferences, authorPrefKey)) {
          // Backup does not have this author, store default preference (undefined or true)
          //if (!Object.prototype.hasOwnProperty.call(updatedDEIAuthorsBackup, authorPrefKey)) {
          //  updatedDEIAuthorsBackup[authorPrefKey] = authorPreferences[authorPrefKey];
          //}
          // Set author preference to true
          updatedAuthorPreferences[authorPrefKey] = true;
        }
      }
    });
  });

  // Save updated authorPreferences and deiAuthorsBackup
  chrome.storage.local.set(
    {
      authorPreferences: updatedAuthorPreferences,
    },
    () => {
      console.log('DEI authorPreferences have been updated after extension update.');
    },
  );
}

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Initialize default settings
    const defaultSettings = {
      enableDEIFiltering: false,
      authorPreferences: {},
      sites: {},
      filteredAuthors: initialFilteredAuthors, // Ensure this is correctly imported
    };

    // Set default settings in chrome.storage.local
    chrome.storage.local.set(defaultSettings, () => {
      console.log('Storage initialized with default settings.');
    });

    // Optionally open the options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Fetch current data from chrome.storage.local
    chrome.storage.local.get(
      ['filteredAuthors', 'enableDEIFiltering', 'authorPreferences', 'deiAuthorsBackup', 'sites'],
      items => {
        const enableDEIFiltering = items.enableDEIFiltering || false;
        const authorPreferences = items.authorPreferences || {};
        //const deiAuthorsBackup = items.deiAuthorsBackup || {};
        const sites = items.sites || [];
        initialFilteredAuthors.forEach(siteConfig => {
          if (!sites[siteConfig.siteKey]) {
            sites[siteConfig.siteKey] = { enabled: true }; // Add new site to sites map
          }
        });
        chrome.storage.local.set({ sites: sites }, () => {
          console.log('Sites map updated with new site data.');
        });

        // Save the merged data back to chrome.storage.local
        chrome.storage.local.set({ filteredAuthors: initialFilteredAuthors }, () => {
          console.log('filteredAuthors has been updated with new data.');

          // If enableDEIFiltering is enabled, update authorPreferences
          if (enableDEIFiltering) {
            // Update authorPreferences for new DEI authors
            updateDEIAuthorPreferences(initialFilteredAuthors, authorPreferences);
          }
        });
      },
    );
  }
});

// @ts-expect-error Not all of them need to return
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const count = message.count;
    const text = count > 0 ? count.toString() : '';
    const tabId = sender.tab!.id;

    // Update the badge text
    chrome.action.setBadgeText({ text: text, tabId: tabId });
    // Optional: Set the badge background color
    chrome.action.setBadgeBackgroundColor({ color: '#282828', tabId: tabId });
    // Optional: Set the badge background color
    chrome.action.setBadgeTextColor({ color: '#F2F2F2', tabId: tabId });
  } else if (message.action === 'updatePerPageBlockedCount') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId !== null) {
      perTabBlockedCounts[tabId!] = message.count;

      chrome.runtime.sendMessage(
        {
          action: 'perPageBlockedCountUpdated',
          tabId: tabId,
          count: message.count,
        },
        () => {
          if (chrome.runtime.lastError) {
            // Just here to remove errors when popup is closed
          } else {
            // Just here to remove errors when popup is closed
          }
        },
      );
    }
  } else if (message.action === 'getPerPageBlockedCount') {
    const tabId = message.tabId;
    const count = perTabBlockedCounts[tabId] || 0;
    sendResponse({ count });
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

// Clear the badge when the tab is updated or removed
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // If there's a new URL, we know the user navigated away or reloaded
  if (changeInfo.url) {
    chrome.action.setBadgeText({ text: '', tabId });
    delete perTabBlockedCounts[tabId];
  }
});

// Not sure if this is necessary, but it's included for completeness
//chrome.tabs.onRemoved.addListener(tabId => {
//  chrome.action.setBadgeText({ text: '', tabId: tabId });
//  delete perTabBlockedCounts[tabId];
//});
