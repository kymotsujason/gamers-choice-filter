export interface Author {
  name: string;
  dei?: boolean;
}

export interface SiteConfig {
  siteKey: string;
  hostnames: string[];
  postSelector: string[];
  authorSelector: string[];
  observerTargetSelector?: string;
  articleAuthorSelector: string;
  hidden: boolean[];
  authors: Author[];
}

export interface BlockedPostTimeCount {
  count: number;
  timestamp: string;
}

export interface AuthorPreference {
  [siteAuthorKey: string]: boolean;
}

export interface SiteSettings {
  enabled: boolean;
  enableFullscreenPopup: boolean;
  enablePopup: boolean;
}
