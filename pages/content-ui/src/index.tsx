import { createRoot } from 'react-dom/client';
import FullscreenPopup from '@src/FullscreenPopup';
import Popup from '@src/Popup';
// @ts-expect-error Because file doesn't exist before build
import tailwindcssOutput from '../dist/tailwind-output.css?inline';
import type { SiteConfig, Author, AuthorPreference, SiteSettings } from './data/types';

// Fullscreen popup setup
function loadFullscreenPopup() {
  const root = document.createElement('div');
  root.id = 'gamers-choice-filter-fullscreen-popup';
  root.style.visibility = 'hidden';
  root.style.position = 'fixed';
  root.style.left = '50%';
  root.style.top = '50%';
  root.style.transform = 'translate(-272px, -144px)';
  root.style.width = '544px';
  root.style.height = '264px';
  root.style.fontSize = '14px';

  document.body.append(root);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  const shadowRoot = root.attachShadow({ mode: 'open' });

  if (navigator.userAgent.includes('Firefox')) {
    /**
     * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
     * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
     *
     * Injecting styles into the document, this may cause style conflicts with the host page
     */
    const styleElement = document.createElement('style');
    styleElement.innerHTML = tailwindcssOutput;
    shadowRoot.appendChild(styleElement);
  } else {
    /** Inject styles into shadow dom */
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(tailwindcssOutput);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  createRoot(rootIntoShadow).render(<FullscreenPopup />);
}

// Popup setup
function loadPopup() {
  const root = document.createElement('div');
  root.id = 'gamers-choice-filter-popup';
  root.style.visibility = 'hidden';
  root.style.position = 'fixed';
  root.style.right = '3%';
  root.style.top = '3%';
  root.style.zIndex = '10000000';

  document.body.append(root);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  const shadowRoot = root.attachShadow({ mode: 'open' });

  if (navigator.userAgent.includes('Firefox')) {
    /**
     * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
     * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
     *
     * Injecting styles into the document, this may cause style conflicts with the host page
     */
    const styleElement = document.createElement('style');
    styleElement.innerHTML = tailwindcssOutput;
    shadowRoot.appendChild(styleElement);
  } else {
    /** Inject styles into shadow dom */
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(tailwindcssOutput);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  createRoot(rootIntoShadow).render(<Popup />);
}

// Content script setup
(function () {
  const hostname = window.location.hostname;

  // Variables to store data
  let filteredAuthorsData: SiteConfig[] = [];
  let authorPreferences: AuthorPreference = {};
  let siteSettings: { [key: string]: SiteSettings } = {};
  let showFullscreenPopup = true;
  let showPopup = true;
  const fontSize = window.getComputedStyle(document.documentElement).fontSize;

  function loadData() {
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
        loadFullscreenPopup();
        loadPopup();
        waitForObserverTarget(siteConfig);
      }
    });
  }

  function waitForObserverTarget(siteConfig: SiteConfig) {
    const observerTargetSelector = siteConfig.articleAuthorSelector || 'body';

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
    const { authors } = siteConfig;
    const siteAuthors = authors || [];

    if (siteAuthors.length === 0) return; // No authors to filter

    hideFilteredPosts(siteConfig, siteAuthors);
    observeDOM(siteConfig, siteAuthors);
  }

  function hideFilteredPosts(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const { siteKey } = siteConfig;

    const fullscreenPopup = document.querySelector('div#gamers-choice-filter-fullscreen-popup');
    const popup = document.querySelector('div#gamers-choice-filter-popup');
    const authorElement = document.querySelector(siteConfig.articleAuthorSelector);
    if (authorElement) {
      const authorName = authorElement.textContent!.trim();
      // Check if the author is in the site's authors list
      const authorInList = siteAuthors.find(author => author.name === authorName);

      if (authorInList) {
        const authorPrefKey = `${siteKey}:${authorName}`;
        const shouldFilter = authorPreferences[authorPrefKey] === true;

        for (let i = 0; i < siteConfig.articleDOMSelector.length; i++) {
          const articleDOM = document.querySelector(siteConfig.articleDOMSelector[i]);
          if (shouldFilter) {
            if (siteSettings[siteKey].enableFullscreenPopup && showFullscreenPopup) {
              document.documentElement.style.fontSize = '14px';
              (articleDOM as HTMLElement).style.display = 'none';
              (fullscreenPopup as HTMLElement).style.visibility = 'visible';
              (popup as HTMLElement).style.visibility = 'hidden';
            } else {
              document.documentElement.style.fontSize = fontSize;
              (articleDOM as HTMLElement).style.display = 'inherit';
              (fullscreenPopup as HTMLElement).style.visibility = 'hidden';
              if (
                siteSettings[siteKey].enablePopup &&
                (fullscreenPopup as HTMLElement).style.visibility === 'hidden' &&
                showPopup
              ) {
                (popup as HTMLElement).style.visibility = 'visible';
              } else {
                (popup as HTMLElement).style.visibility = 'hidden';
              }
            }
          } else {
            document.documentElement.style.fontSize = fontSize;
            (articleDOM as HTMLElement).style.display = 'inherit';
            (fullscreenPopup as HTMLElement).style.visibility = 'hidden';
          }
        }
      }
    }
  }

  function observeDOM(siteConfig: SiteConfig, siteAuthors: Author[]) {
    const targetNode = document.querySelector(siteConfig.articleAuthorSelector || 'body');
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
      if (
        changes.filteredAuthors ||
        changes.authorPreferences ||
        changes.sites ||
        changes.disableFullscreen ||
        changes.disablePopup
      ) {
        if (changes.disableFullscreen && changes.disableFullscreen.newValue === true) {
          showFullscreenPopup = false;
          chrome.storage.local.set({ disableFullscreen: false });
        }
        if (changes.disablePopup && changes.disablePopup.newValue === true) {
          showPopup = false;
          const popupSelector = document.querySelector('div#gamers-choice-filter-popup');
          (popupSelector as HTMLElement).style.visibility = 'hidden';
          chrome.storage.local.set({ disablePopup: false });
        }
        loadData();
      }
    }
  });

  loadData();
})();
