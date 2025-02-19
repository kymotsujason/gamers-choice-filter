// contentScript.ts
import type { SiteConfig, Author, BlockedPostTimeCount } from './data/types';

(function () {
  const hostname = window.location.hostname;

  // Variables to store data
  let filteredAuthorsData: SiteConfig[] = [];
  let authorPreferences: { [key: string]: boolean } = {};
  let siteSettings: { [key: string]: { enabled: boolean } } = {};
  let lastBadgeCount = 0;
  let cumulativeHiddenCount = 0;
  let perPageBlockedCount = 0;
  const dev = false; // Set to true for development purposes
  let authorArr = {};

  // Initialize statistics when the content script runs
  function initializeStatistics() {
    if (dev) {
      chrome.storage.local.get(['authorArray'], data => {
        if (!data.authorArray) {
          chrome.storage.local.set({ authorArray: {} });
        }
      });
    }
    chrome.storage.local.get(['blockedPostsOverTime', 'blockedPostsPerSite', 'lifetimeBlockedCount'], data => {
      if (!data.blockedPostsOverTime) {
        chrome.storage.local.set({ blockedPostsOverTime: [] });
      }
      if (!data.blockedPostsPerSite) {
        chrome.storage.local.set({ blockedPostsPerSite: {} });
      }
      if (!data.lifetimeBlockedCount) {
        chrome.storage.local.set({ lifetimeBlockedCount: 0 });
      }
    });
  }

  function loadData() {
    if (dev) {
      chrome.storage.local.get(['authorArray'], items => {
        authorArr = items.authorArray || {};
      });
    }
    chrome.storage.local.get(['filteredAuthors', 'authorPreferences', 'sites'], items => {
      filteredAuthorsData = items.filteredAuthors || [];
      authorPreferences = items.authorPreferences || {};
      siteSettings = items.sites || {};

      // Determine if current site is supported
      const siteConfig = filteredAuthorsData.find(site => site.hostnames && site.hostnames.includes(hostname));

      if (!siteConfig) return; // Site not supported

      const siteEnabled = siteSettings[siteConfig.siteKey]?.enabled !== false;

      // Proceed if filtering is enabled
      if (siteEnabled) {
        waitForObserverTarget(siteConfig);
      }
    });
  }

  function waitForObserverTarget(siteConfig: SiteConfig) {
    const observerTargetSelector = siteConfig.observerTargetSelector || 'body';

    function checkExist() {
      const targetNode = document.querySelector(observerTargetSelector);
      if (targetNode) {
        initContentScript(siteConfig);
      } else {
        requestAnimationFrame(checkExist);
      }
    }

    requestAnimationFrame(checkExist);
  }

  function initContentScript(siteConfig: SiteConfig) {
    perPageBlockedCount = 0; // Reset per-page blocked count
    cumulativeHiddenCount = 0; // Reset cumulative count for this page load
    const { authors } = siteConfig;
    const siteAuthors = authors || [];

    if (siteAuthors.length === 0) return; // No authors to filter

    hideFilteredPosts(siteConfig, siteAuthors);
    observeDOM(siteConfig, siteAuthors);
  }

  function hideFilteredPosts(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const { siteKey, postSelector, authorSelector, hidden } = siteConfig;
    let hiddenPostCount = 0; // Number of posts hidden in this invocation

    for (let i = 0; i < postSelector.length; i++) {
      const postSelectorElement = postSelector[i];
      const authorSelectorElement = authorSelector[i];
      const posts = document.querySelectorAll(postSelectorElement);
      posts.forEach(post => {
        const authorElement = post.querySelector(authorSelectorElement);
        if (authorElement) {
          const authorName = authorElement.textContent!.trim();
          if (dev) {
            // @ts-expect-error Dev stuff, could change type at any point
            if (!authorArr[siteKey]) {
              // @ts-expect-error Dev stuff, could change type at any point
              authorArr[siteKey] = [];
            }
            // @ts-expect-error Dev stuff, could change type at any point
            if (!authorArr[siteKey].includes(authorName)) {
              // @ts-expect-error Dev stuff, could change type at any point
              authorArr[siteKey].push(authorName);
            }
          }
          // Check if the author is in the site's authors list
          const authorInList = siteAuthors.find(author => author.name === authorName);

          if (authorInList) {
            const authorPrefKey = `${siteKey}:${authorName}`;
            const shouldFilter = authorPreferences[authorPrefKey] === true;

            if (shouldFilter) {
              if (hidden[i]) {
                if ((post as HTMLElement).style.display !== 'none') {
                  (post as HTMLElement).style.display = 'none';
                  hiddenPostCount++; // Increment the count
                }
              } else {
                if ((post as HTMLElement).style.visibility !== 'hidden') {
                  (post as HTMLElement).style.visibility = 'hidden';
                  hiddenPostCount++; // Increment the count
                }
              }
            } else {
              if (hidden[i]) {
                if ((post as HTMLElement).style.visibility !== 'visible') {
                  (post as HTMLElement).style.display = 'inherit';
                }
              } else {
                if ((post as HTMLElement).style.visibility !== 'visible') {
                  (post as HTMLElement).style.visibility = 'visible';
                }
              }
            }
          }
        }
      });
    }
    if (dev) {
      // @ts-expect-error Dev stuff, could change type at any point
      console.log(authorArr[siteKey]);
      // @ts-expect-error Dev stuff, could change type at any point
      authorArr[siteKey].sort();
      chrome.storage.local.set({ authorArray: authorArr });
    }

    if (hiddenPostCount > 0) {
      cumulativeHiddenCount += hiddenPostCount;
      perPageBlockedCount += hiddenPostCount;

      // Send per-page blocked count to background script
      chrome.runtime.sendMessage({
        action: 'updatePerPageBlockedCount',
        count: perPageBlockedCount,
      });

      // Update cumulativeHiddenCount in storage
      chrome.storage.local.set({ cumulativeHiddenCount });

      // Update lifetimeBlockedCount
      chrome.storage.local.get('lifetimeBlockedCount', data => {
        const lifetimeBlockedCount = (data.lifetimeBlockedCount || 0) + hiddenPostCount;
        chrome.storage.local.set({ lifetimeBlockedCount });
      });

      const timestamp = new Date().toISOString(); // Current time in ISO format

      // Update blockedPostsOverTime
      chrome.storage.local.get(['blockedPostsOverTime'], data => {
        let blockedPostsOverTime = data.blockedPostsOverTime || [];
        blockedPostsOverTime.push({ timestamp, count: hiddenPostCount });

        // Keep only data from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        blockedPostsOverTime = blockedPostsOverTime.filter((entry: BlockedPostTimeCount) => {
          return new Date(entry.timestamp) >= thirtyDaysAgo;
        });

        chrome.storage.local.set({ blockedPostsOverTime });
      });

      // Update blocked posts per site
      chrome.storage.local.get(['blockedPostsPerSite'], data => {
        const blockedPostsPerSite = data.blockedPostsPerSite || {};
        blockedPostsPerSite[siteKey] = (blockedPostsPerSite[siteKey] || 0) + hiddenPostCount;
        chrome.storage.local.set({ blockedPostsPerSite });
      });

      // Update badge
      updateBadge(cumulativeHiddenCount);
    }
  }

  function updateBadge(count: number) {
    if (count !== lastBadgeCount) {
      lastBadgeCount = count;
      // Update badge
      chrome.runtime.sendMessage({ action: 'updateBadge', count });
    }
  }

  function observeDOM(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const { observerTargetSelector } = siteConfig;
    const targetNode = document.querySelector(observerTargetSelector || 'body');
    if (!targetNode) return;

    const config = { childList: true, subtree: true };
    const observer = new MutationObserver(() => {
      hideFilteredPosts(siteConfig, siteAuthors);
    });

    observer.observe(targetNode, config);
  }

  // Watch for changes in chrome.storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.filteredAuthors || changes.authorPreferences || changes.sites) {
        loadData();
      }
    }
  });

  // Initialize statistics and load data
  initializeStatistics();
  loadData();
})();
