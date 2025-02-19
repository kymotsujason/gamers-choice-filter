import type { SiteConfig } from '../data/filteredAuthors';

export interface AuthorPreference {
  [siteAuthorKey: string]: boolean; // Keyed by 'siteKey:authorName'
}

export interface SiteSettings {
  enabled: boolean;
  enableFullscreenPopup: boolean;
  enablePopup: boolean;
}

export interface ExtensionSettings {
  enableDEIFiltering: boolean;
  authorPreferences: AuthorPreference;
  sites: Record<string, SiteSettings>;
  filteredAuthors: SiteConfig[];
  deiSitesBackup?: Record<string, SiteSettings>; // Backup for sites
  deiAuthorsBackup?: AuthorPreference; // Backup for DEI authors
}

export const getSettings = (): Promise<ExtensionSettings> => {
  return new Promise(resolve => {
    chrome.storage.local.get(
      {
        enableDEIFiltering: false,
        authorPreferences: {},
        sites: {},
        filteredAuthors: [],
        deiSitesBackup: null,
        deiAuthorsBackup: null,
      },
      items => {
        resolve(items as ExtensionSettings);
      },
    );
  });
};

export const saveSettings = (settings: ExtensionSettings): Promise<void> => {
  return new Promise(resolve => {
    chrome.storage.local.set(settings, () => {
      resolve();
    });
  });
};

// Functions to get and save author lists
export const getFilteredAuthors = (): Promise<SiteConfig[]> => {
  return new Promise(resolve => {
    chrome.storage.local.get({ filteredAuthors: [] }, items => {
      resolve(items.filteredAuthors || []);
    });
  });
};

export const saveFilteredAuthors = (filteredAuthors: SiteConfig[]): Promise<void> => {
  return new Promise(resolve => {
    chrome.storage.local.set({ filteredAuthors }, () => {
      resolve();
    });
  });
};
