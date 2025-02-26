import type React from 'react';
import { useEffect, useState } from 'react';
import type { ExtensionSettings, SiteSettings as SiteSettingsType } from '../utils/storage';
import { getSettings, saveSettings, getFilteredAuthors, saveFilteredAuthors } from '../utils/storage';
import SiteOption from './SiteOption';
import type { SelectChangeEvent } from '@mui/material';
import {
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Box,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import type { SiteConfig } from '../data/filteredAuthors';
import { filteredAuthors as initialFilteredAuthors } from '../data/filteredAuthors';

interface SiteSettingsProps {
  selectedSiteKey?: string;
  selectedAuthor?: string;
  onAuthorFocus?: () => void;
}

const SiteSettings: React.FC<SiteSettingsProps> = ({ selectedSiteKey, selectedAuthor, onAuthorFocus }) => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [filteredAuthors, setFilteredAuthors] = useState<SiteConfig[]>([]);
  const [selectedSiteIndex, setSelectedSiteIndex] = useState<number>(0);
  const [openConfirmResetAll, setOpenConfirmResetAll] = useState(false);

  useEffect(() => {
    // Load settings and filtered authors on mount
    Promise.all([getSettings(), getFilteredAuthors()]).then(([settingsData, authorsData]) => {
      chrome.storage.local.get(['selectedSiteKey'], data => {
        const storedSiteKeyIndex = data.selectedSiteKey;
        setSettings(settingsData);
        setFilteredAuthors(authorsData);
        if (selectedSiteKey) {
          if (authorsData.length > 0) {
            if (selectedSiteKey) {
              const index = authorsData.findIndex(siteConfig => siteConfig.siteKey === selectedSiteKey);
              if (index !== -1) {
                setSelectedSiteIndex(index);
                chrome.storage.local.set({ selectedSiteKey: index });
              } else {
                setSelectedSiteIndex(0);
                chrome.storage.local.set({ selectedSiteKey: 0 });
              }
            } else {
              setSelectedSiteIndex(0);
              chrome.storage.local.set({ selectedSiteKey: 0 });
            }
          }
        } else {
          setSelectedSiteIndex(storedSiteKeyIndex || 0);
        }
      });
    });
  }, [selectedSiteKey]);

  useEffect(() => {
    // Listen for changes in chrome.storage.local
    const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Reload settings and filtered authors
        Promise.all([getSettings(), getFilteredAuthors()]).then(([settingsData, authorsData]) => {
          setSettings(settingsData);
          setFilteredAuthors(authorsData);
        });
      }
    };

    chrome.storage.onChanged.addListener(storageChangeListener);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, []);

  const handleSiteChange = (event: SelectChangeEvent<number>) => {
    setSelectedSiteIndex(event.target.value as number);
    chrome.storage.local.set({ selectedSiteKey: event.target.value as number });
  };

  const updateSiteSettings = async (
    siteKey: string,
    siteSettings: SiteSettingsType,
    newSettings?: ExtensionSettings,
  ) => {
    if (!settings) return;
    if (newSettings) {
      const updatedSettings = {
        ...newSettings,
        sites: {
          ...newSettings.sites,
          [siteKey]: siteSettings,
        },
      };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
    } else {
      const updatedSettings = {
        ...settings,
        sites: {
          ...settings.sites,
          [siteKey]: siteSettings,
        },
      };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
    }
  };

  const updateFilteredAuthors = async (updatedSiteConfig: SiteConfig) => {
    const updatedFilteredAuthors = filteredAuthors.map(config =>
      config.siteKey === updatedSiteConfig.siteKey ? updatedSiteConfig : config,
    );
    setFilteredAuthors(updatedFilteredAuthors);
    await saveFilteredAuthors(updatedFilteredAuthors);
  };

  // Function to reset all site settings to default
  const handleResetAll = () => {
    setOpenConfirmResetAll(true);
  };

  const confirmResetAll = async () => {
    if (!settings) return;

    // Reset settings to default
    const defaultSettings: ExtensionSettings = {
      enableDEIFiltering: false,
      authorPreferences: {},
      sites: {},
      filteredAuthors: initialFilteredAuthors,
    };

    // Update local state
    setSettings(defaultSettings);
    setFilteredAuthors(initialFilteredAuthors);

    // Save to storage
    await saveSettings(defaultSettings);

    setOpenConfirmResetAll(false);
  };

  const cancelResetAll = () => {
    setOpenConfirmResetAll(false);
  };

  if (settings === null || filteredAuthors.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedSiteConfig = filteredAuthors[selectedSiteIndex];

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Site Settings
          </Typography>
          <Button variant="outlined" color="secondary" onClick={handleResetAll}>
            Reset All
          </Button>
        </Box>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="site-select-label">Select Site</InputLabel>
          <Select labelId="site-select-label" value={selectedSiteIndex} label="Select Site" onChange={handleSiteChange}>
            {filteredAuthors.map((siteConfig, index) => (
              <MenuItem key={siteConfig.siteKey} value={index}>
                {siteConfig.siteKey}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedSiteConfig && (
          <Box sx={{ mt: 2 }}>
            <SiteOption
              siteConfig={selectedSiteConfig}
              siteSettings={settings.sites[selectedSiteConfig.siteKey]}
              updateSiteSettings={updateSiteSettings}
              updateFilteredAuthors={updateFilteredAuthors}
              selectedAuthor={selectedAuthor}
              selectedSiteKey={selectedSiteKey}
              onAuthorFocus={onAuthorFocus}
              enableDEIFiltering={settings.enableDEIFiltering}
            />
          </Box>
        )}
      </Paper>
      <Dialog open={openConfirmResetAll} onClose={cancelResetAll}>
        <DialogTitle>Reset All to Default</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset all site settings to default values? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelResetAll}>Cancel</Button>
          <Button onClick={confirmResetAll} color="secondary">
            Reset All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SiteSettings;
