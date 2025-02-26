import type { SiteConfig, Author, BlockedPostTimeCount } from './data/types';

(function () {
  const hostname = window.location.hostname;
  let filteredAuthorsData: SiteConfig[] = [];
  let authorPreferences: { [key: string]: boolean } = {};
  let siteSettings: { [key: string]: { enabled: boolean } } = {};
  let cumulativeHiddenCount = 0;
  let perPageBlockedCount = 0;
  const dev = false;
  let authorArr: { [key: string]: string[] } = {};

  let currentObservers: MutationObserver[] = [];
  let targetPollingObserver: MutationObserver | null = null;

  function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: number | undefined;
    return (...args: Parameters<T>) => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        func(...args);
      }, delay);
    };
  }

  function cleanupObservers() {
    currentObservers.forEach(observer => observer.disconnect());
    currentObservers = [];
    if (targetPollingObserver) {
      targetPollingObserver.disconnect();
      targetPollingObserver = null;
    }
  }

  function reinitializeScript() {
    cleanupObservers();
    //console.log('Reinitializing content script for a new page/route...');
    loadData();
  }
  const debouncedReinitialize = debounce(reinitializeScript, 100);

  // SPA Navigation Handlers
  window.addEventListener('popstate', debouncedReinitialize);
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    debouncedReinitialize();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('Page became visible, checking for target elements...');
      debouncedReinitialize();
    }
  });

  // Last resort polling for SPA
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('URL change detected via polling. Reinitializing...');
      debouncedReinitialize();
    }
  }, 500);

  function getStorageData<T>(keys: string | string[]): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, result => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(result as T);
      });
    });
  }

  function initializeStatistics() {
    if (dev) {
      chrome.storage.local.get(['authorArray'], data => {
        if (!data.authorArray) {
          chrome.storage.local.set({ authorArray: {} });
        }
      });
    }
    chrome.storage.local.get(['blockedPostsOverTime', 'blockedPostsPerSite', 'lifetimeBlockedCount'], data => {
      if (!data.blockedPostsOverTime) chrome.storage.local.set({ blockedPostsOverTime: [] });
      if (!data.blockedPostsPerSite) chrome.storage.local.set({ blockedPostsPerSite: {} });
      if (!data.lifetimeBlockedCount) chrome.storage.local.set({ lifetimeBlockedCount: 0 });
    });
  }

  async function loadData() {
    try {
      const items = await getStorageData<{
        filteredAuthors?: SiteConfig[];
        authorPreferences?: { [key: string]: boolean };
        sites?: { [key: string]: { enabled: boolean } };
      }>(['filteredAuthors', 'authorPreferences', 'sites']);

      filteredAuthorsData = items.filteredAuthors || [];
      authorPreferences = items.authorPreferences || {};
      siteSettings = items.sites || {};

      if (dev) {
        const itemsDev = await getStorageData<{ authorArray?: { [siteKey: string]: string[] } }>(['authorArray']);
        authorArr = itemsDev.authorArray || {};
      }

      const siteConfig = filteredAuthorsData.find(site => site.hostnames && site.hostnames.includes(hostname));

      if (!siteConfig) {
        console.log('Site not supported');
        return;
      }

      const siteEnabled = siteSettings[siteConfig.siteKey]?.enabled !== false;
      if (siteEnabled) {
        waitForObserverTarget(siteConfig);
      }
    } catch (err) {
      console.error('Error loading storage data:', err);
    }
  }

  function waitForObserverTarget(siteConfig: SiteConfig) {
    const observerTargetSelector = siteConfig.observerTargetSelector || 'body';

    function quickCheck() {
      const targetNodes = document.querySelectorAll(observerTargetSelector);
      if (targetNodes.length > 0) {
        if (targetPollingObserver) {
          targetPollingObserver.disconnect();
          targetPollingObserver = null;
        }
        initContentScript(siteConfig);
      }
    }
    requestAnimationFrame(quickCheck);

    if (!targetPollingObserver) {
      targetPollingObserver = new MutationObserver(() => quickCheck());
      targetPollingObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initContentScript(siteConfig: SiteConfig) {
    perPageBlockedCount = 0;
    cumulativeHiddenCount = 0;

    const { authors } = siteConfig;
    const siteAuthors = authors || [];
    if (siteAuthors.length === 0) return;

    hideFilteredPosts(siteConfig, siteAuthors);
    observeDOM(siteConfig, siteAuthors);
  }

  function hideFilteredPosts(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const { siteKey, postSelector, authorSelector, hidden } = siteConfig;
    let hiddenPostCount = 0;

    for (let i = 0; i < postSelector.length; i++) {
      const postSelectorElement = postSelector[i];
      const authorSelectorElement = authorSelector[i];
      const posts = document.querySelectorAll(postSelectorElement);

      posts.forEach(post => {
        const authorElement = post.querySelector(authorSelectorElement);
        if (authorElement) {
          const authorName = authorElement.textContent!.trim();

          if (dev) {
            if (!authorArr[siteKey]) {
              authorArr[siteKey] = [];
            }
            if (!authorArr[siteKey].includes(authorName)) {
              authorArr[siteKey].push(authorName);
            }
          }

          const authorInList = siteAuthors.find(author => author.name === authorName);
          if (authorInList) {
            const authorPrefKey = `${siteKey}:${authorName}`;
            const shouldFilter = authorPreferences[authorPrefKey] === true;

            if (shouldFilter) {
              if (hidden[i]) {
                if ((post as HTMLElement).style.display !== 'none') {
                  (post as HTMLElement).style.display = 'none';
                  hiddenPostCount++;
                }
              } else {
                if ((post as HTMLElement).style.visibility !== 'hidden') {
                  (post as HTMLElement).style.visibility = 'hidden';
                  hiddenPostCount++;
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
      console.log(authorArr[siteKey]);
      authorArr[siteKey].sort();
      chrome.storage.local.set({ authorArray: authorArr });
    }

    if (hiddenPostCount > 0) {
      cumulativeHiddenCount += hiddenPostCount;
      perPageBlockedCount += hiddenPostCount;

      updateBadge(cumulativeHiddenCount);

      chrome.runtime.sendMessage({
        action: 'updatePerPageBlockedCount',
        count: perPageBlockedCount,
      });

      chrome.storage.local.set({ cumulativeHiddenCount });

      chrome.storage.local.get('lifetimeBlockedCount', data => {
        const lifetimeBlockedCount = (data.lifetimeBlockedCount || 0) + hiddenPostCount;
        chrome.storage.local.set({ lifetimeBlockedCount });
      });

      const timestamp = new Date().toISOString();

      chrome.storage.local.get(['blockedPostsOverTime'], data => {
        let blockedPostsOverTime = data.blockedPostsOverTime || [];
        blockedPostsOverTime.push({ timestamp, count: hiddenPostCount });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        blockedPostsOverTime = blockedPostsOverTime.filter((entry: BlockedPostTimeCount) => {
          return new Date(entry.timestamp) >= thirtyDaysAgo;
        });

        chrome.storage.local.set({ blockedPostsOverTime });
      });

      chrome.storage.local.get(['blockedPostsPerSite'], data => {
        const blockedPostsPerSite = data.blockedPostsPerSite || {};
        blockedPostsPerSite[siteKey] = (blockedPostsPerSite[siteKey] || 0) + hiddenPostCount;
        chrome.storage.local.set({ blockedPostsPerSite });
      });
    }
  }

  function updateBadge(count: number) {
    chrome.runtime.sendMessage({ action: 'updateBadge', count });
  }

  function observeDOM(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const targetNodes = document.querySelectorAll(siteConfig.observerTargetSelector || 'body');
    if (!targetNodes.length) return;

    const debouncedHideFilteredPosts = debounce(() => {
      hideFilteredPosts(siteConfig, siteAuthors);
    }, 100);

    const config = { childList: true, subtree: true };
    targetNodes.forEach(node => {
      const observer = new MutationObserver(debouncedHideFilteredPosts);
      observer.observe(node, config);
      currentObservers.push(observer);
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.filteredAuthors || changes.authorPreferences || changes.sites) {
        loadData();
      }
    }
  });

  // Start Everything
  initializeStatistics();
  loadData();
})();
