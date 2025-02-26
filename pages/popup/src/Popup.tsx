import type { FC, SyntheticEvent, ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import type { SwitchProps } from '@mui/material';
import { Box, Typography, Switch, Tabs, Tab, AppBar, Toolbar, IconButton, styled } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import type { ExtensionSettings } from './utils/storage';
import { getFilteredAuthors, getSettings, saveSettings } from './utils/storage';
import OverTimeStatisticsTab from './components/OverTimeStatisticsTab';
import PerSiteStatisticsTab from './components/PerSiteStatisticsTab';
import logo from './assets/icon-128.png';
import kofi from './assets/kofi.png';

const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 82,
  height: 50,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(29px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#65C466',
        opacity: 1,
        border: 0,
        ...theme.applyStyles('dark', {
          backgroundColor: '#2ECA45',
        }),
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
      ...theme.applyStyles('dark', {
        color: theme.palette.grey[600],
      }),
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.7,
      ...theme.applyStyles('dark', {
        opacity: 0.3,
      }),
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 46,
    height: 46,
  },
  '& .MuiSwitch-track': {
    borderRadius: 50 / 2,
    backgroundColor: '#E9E9EA',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
    ...theme.applyStyles('dark', {
      backgroundColor: '#39393D',
    }),
  },
}));

const Popup: FC = () => {
  const [enableDEIFiltering, setEnableDEIFiltering] = useState(false);
  const [currentBlockedCount, setCurrentBlockedCount] = useState(0);
  const [lifetimeBlockedCount, setLifetimeBlockedCount] = useState(0);
  const [currentTab, setCurrentTab] = useState(0);
  const [currentTabUrl, setCurrentTabUrl] = useState('');
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);

  // Open your extension's options page
  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleOpenKofi = () => {
    chrome.tabs.create({ url: 'https://ko-fi.com/kymotsujason' });
  };

  useEffect(() => {
    getSettings().then(data => {
      setSettings(data);
    });
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        const tab = tabs[0];
        let url = tab.url;
        if (url?.includes('www.')) {
          url = url.split('www.')[1].split('/')[0];
        } else if (url?.includes('http://')) {
          url = url.split('http://')[1].split('/')[0];
        } else if (url?.includes('https://')) {
          url = url.split('https://')[1].split('/')[0];
        }
        setCurrentTabUrl(url || 'Unknown URL');
        setCurrentTabId(tab.id ?? null);

        // Get the per-page blocked count from the background script
        if (tab.id !== undefined) {
          chrome.runtime.sendMessage({ action: 'getPerPageBlockedCount', tabId: tab.id }, response => {
            if (response && response.count !== undefined) {
              setCurrentBlockedCount(response.count);
            } else {
              setCurrentBlockedCount(0);
            }
          });
        }
      }
    });

    // Load counts
    chrome.storage.local.get(['cumulativeHiddenCount', 'lifetimeBlockedCount'], data => {
      setCurrentBlockedCount(data.cumulativeHiddenCount || 0);
      setLifetimeBlockedCount(data.lifetimeBlockedCount || 0);
    });

    // Load DEI filtering setting
    chrome.storage.local.get('enableDEIFiltering', data => {
      setEnableDEIFiltering(data.enableDEIFiltering || false);
    });

    // Listen for changes
    const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        if (changes.cumulativeHiddenCount) {
          setCurrentBlockedCount(changes.cumulativeHiddenCount.newValue || 0);
        }
        if (changes.lifetimeBlockedCount) {
          setLifetimeBlockedCount(changes.lifetimeBlockedCount.newValue || 0);
        }
      }
      if (areaName === 'local') {
        if (changes.enableDEIFiltering) {
          setEnableDEIFiltering(changes.enableDEIFiltering.newValue || false);
        }
      }
    };

    const messageListener = (message: { action: string; tabId: number; count: number }) => {
      if (message.action === 'perPageBlockedCountUpdated') {
        if (message.tabId === currentTabId) {
          setCurrentBlockedCount(message.count);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    chrome.storage.onChanged.addListener(storageChangeListener);

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, [currentTabId]);

  const handleToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setEnableDEIFiltering(checked);
    chrome.storage.local.set({ enableDEIFiltering: checked });
    if (!settings) return;
    let updatedSettings = { ...settings, enableDEIFiltering: checked };

    const filteredAuthorsData = await getFilteredAuthors();

    if (checked) {
      // Save current settings for sites and DEI authors
      const currentSitesBackup = { ...settings.sites };
      const currentAuthorPreferencesBackup = { ...settings.authorPreferences };

      // Create new settings with filtering enabled for all sites and DEI authors
      const updatedSites = { ...settings.sites };
      const updatedAuthorPreferences = { ...settings.authorPreferences };

      filteredAuthorsData.forEach(siteConfig => {
        // Backup current site settings
        if (!Object.prototype.hasOwnProperty.call(currentSitesBackup, siteConfig.siteKey)) {
          currentSitesBackup[siteConfig.siteKey] = { ...settings.sites[siteConfig.siteKey] };
        }

        // Enable site filtering
        updatedSites[siteConfig.siteKey] = { enabled: true, enableFullscreenPopup: true, enablePopup: true };

        siteConfig.authors.forEach(author => {
          const authorPrefKey = `${siteConfig.siteKey}:${author.name}`;

          // Backup current author preference if DEI author
          if (author.dei === true) {
            if (!Object.prototype.hasOwnProperty.call(currentAuthorPreferencesBackup, authorPrefKey)) {
              currentAuthorPreferencesBackup[authorPrefKey] = settings.authorPreferences[authorPrefKey];
            }
            // Enable author filtering
            updatedAuthorPreferences[authorPrefKey] = true;
          }
        });
      });

      updatedSettings = {
        ...updatedSettings,
        sites: updatedSites,
        authorPreferences: updatedAuthorPreferences,
        deiSitesBackup: currentSitesBackup,
        deiAuthorsBackup: currentAuthorPreferencesBackup,
      };
    } else {
      // Retrieve backups
      const deiSitesBackup = settings.deiSitesBackup || {};
      const deiAuthorsBackup = settings.deiAuthorsBackup || {};

      // Restore site settings
      const restoredSites = { ...settings.sites };
      Object.keys(deiSitesBackup).forEach(siteKey => {
        restoredSites[siteKey] = deiSitesBackup[siteKey];
      });

      // Restore author preferences
      const restoredAuthorPreferences = { ...settings.authorPreferences };

      // Collect DEI authors from filteredAuthorsData
      filteredAuthorsData.forEach(siteConfig => {
        const siteKey = siteConfig.siteKey;
        siteConfig.authors.forEach(author => {
          if (author.dei === true) {
            const authorPrefKey = `${siteKey}:${author.name}`;
            if (Object.prototype.hasOwnProperty.call(deiAuthorsBackup, authorPrefKey)) {
              // Restore backed-up preference
              restoredAuthorPreferences[authorPrefKey] = deiAuthorsBackup[authorPrefKey];
            } else {
              // Remove preference if it wasn't set before
              delete restoredAuthorPreferences[authorPrefKey];
            }
          }
        });
      });

      updatedSettings = {
        ...updatedSettings,
        sites: restoredSites,
        authorPreferences: restoredAuthorPreferences,
        deiSitesBackup: undefined, // Restoring settings is complicated
        deiAuthorsBackup: undefined,
      };
    }

    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ width: 320, minHeight: 400 }}>
      <AppBar position="static" sx={{ bgcolor: '#000000' }}>
        <Toolbar>
          <IconButton edge="start" disabled={true}>
            <img src={logo} alt="logo" width={24} height={24} />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Gamer's Choice Filter
          </Typography>

          <IconButton edge="end" color="inherit" onClick={handleOpenKofi}>
            <img src={kofi} alt="logo" width={24} height={24} />
          </IconButton>
          <IconButton edge="end" color="inherit" onClick={handleOpenOptions}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ mt: 1, color: 'lightgray', overflow: 'auto', whiteSpace: 'nowrap' }}>
            {currentTabUrl}
          </Typography>
          <Typography variant="h5">Blocked: {currentBlockedCount}</Typography>
          <Typography variant="subtitle2" sx={{ color: 'gray' }}>
            Total Blocked: {lifetimeBlockedCount}
          </Typography>
        </Box>

        <IOSSwitch
          checked={enableDEIFiltering}
          onChange={handleToggle}
          name="enableDEIFiltering"
          sx={{ mt: 3, mb: 3 }}
        />

        <Tabs value={currentTab} onChange={handleTabChange} centered>
          <Tab label="Over Time" />
          <Tab label="Per Site" />
        </Tabs>

        {currentTab === 0 && <OverTimeStatisticsTab />}
        {currentTab === 1 && <PerSiteStatisticsTab />}
      </Box>
    </Box>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occur</div>);
