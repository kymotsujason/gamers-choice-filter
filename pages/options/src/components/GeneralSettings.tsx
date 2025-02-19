import type React from 'react';
import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '../utils/storage';
import { getFilteredAuthors, getSettings, saveSettings } from '../utils/storage';
import InfoIcon from '@mui/icons-material/Info';
import { FormControlLabel, Switch, Typography, Paper, Box, Tooltip, IconButton } from '@mui/material';

const GeneralSettings: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Load settings on mount
    getSettings().then(data => {
      setSettings(data);
    });
  }, []);

  useEffect(() => {
    // Listen for changes in chrome.storage.local
    const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.enableDEIFiltering) {
        if (changes.enableDEIFiltering.oldValue === true && changes.enableDEIFiltering.newValue === false) {
          setEnabled(false);
          settings!.enableDEIFiltering = false;
          setSettings(settings);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageChangeListener);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, [enabled, settings]);

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, checked } = event.target;
    let updatedSettings = { ...settings, [name]: checked };

    if (name === 'enableDEIFiltering') {
      const filteredAuthorsData = await getFilteredAuthors();

      if (checked) {
        setEnabled(true);
        // Enabling DEI Filtering

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
          // @ts-expect-error undefined doesn't clear storage values
          deiSitesBackup: null,
          // @ts-expect-error undefined doesn't clear storage values
          deiAuthorsBackup: null,
        };
      } else {
        setEnabled(false);
        // Disabling DEI Filtering

        // Retrieve backups
        //const deiSitesBackup = settings.deiSitesBackup || {};
        const deiAuthorsBackup = settings.deiAuthorsBackup || {};

        // Restore site settings
        const restoredSites = { ...settings.sites };
        //Object.keys(deiSitesBackup).forEach(siteKey => {
        //  restoredSites[siteKey] = deiSitesBackup[siteKey];
        //});

        Object.keys(restoredSites).forEach(siteKey => {
          restoredSites[siteKey].enabled = false;
          restoredSites[siteKey].enableFullscreenPopup = false;
          restoredSites[siteKey].enablePopup = false;
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
          // @ts-expect-error undefined doesn't clear storage values
          deiSitesBackup: null,
          // @ts-expect-error undefined doesn't clear storage values
          deiAuthorsBackup: null,
        };
      }
    }
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  if (settings === null) {
    return (
      <Typography variant="body1" component="div">
        Loading...
      </Typography>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        General Settings
      </Typography>
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableDEIFiltering || enabled}
              onChange={handleToggle}
              name="enableDEIFiltering"
            />
          }
          label="Enable DEI Filtering"
        />
        <Tooltip
          title="When enabled, filtering will be enforced for all websites and all DEI-related content, and relevant settings will be locked."
          placement="right">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default GeneralSettings;
