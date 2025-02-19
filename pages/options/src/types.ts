export interface ExtensionSettings {
  enableDEIFiltering: boolean;
  sites: {
    [siteId: string]: SiteSettings;
  };
}

export interface SiteSettings {
  enabled: boolean;
  enableFullscreenPopup: boolean;
  enablePopup: boolean;
  filteredAuthors: string[];
  filteredKeywords?: string[];
}
