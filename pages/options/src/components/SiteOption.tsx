import type React from 'react';
import { useState } from 'react';
import {
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import type { Author, SiteConfig } from '../data/filteredAuthors';
import { filteredAuthors as initialFilteredAuthors } from '../data/filteredAuthors';
import { getSettings, saveSettings, type ExtensionSettings, type SiteSettings } from '../utils/storage';
import AuthorList from './AuthorList';

interface SiteOptionProps {
  siteConfig: SiteConfig;
  siteSettings: SiteSettings;
  updateSiteSettings: (siteKey: string, siteSettings: SiteSettings, newSettings?: ExtensionSettings) => void;
  updateFilteredAuthors: (updatedSiteConfig: SiteConfig) => void;
  selectedAuthor?: string;
  selectedSiteKey?: string;
  onAuthorFocus?: () => void;
  enableDEIFiltering: boolean;
}

const SiteOption: React.FC<SiteOptionProps> = ({
  siteConfig,
  siteSettings,
  updateSiteSettings,
  updateFilteredAuthors,
  selectedAuthor,
  selectedSiteKey,
  onAuthorFocus,
  enableDEIFiltering,
}) => {
  const enabled = siteSettings && siteSettings.enabled ? siteSettings.enabled === true : false;
  const enabledFullscreenPopup =
    siteSettings && siteSettings.enableFullscreenPopup ? siteSettings.enableFullscreenPopup === true : false;
  const enabledPopup = siteSettings && siteSettings.enablePopup ? siteSettings.enablePopup === true : false;
  const [openConfirmReset, setOpenConfirmReset] = useState(false);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    updateSiteSettings(siteConfig.siteKey, {
      enabled: checked,
      enableFullscreenPopup: enabledFullscreenPopup,
      enablePopup: enabledPopup,
    });
  };

  const handleFullscreenToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    updateSiteSettings(siteConfig.siteKey, {
      enabled: enabled,
      enableFullscreenPopup: checked,
      enablePopup: enabledPopup,
    });
  };

  const handlePopupToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    updateSiteSettings(siteConfig.siteKey, {
      enabled: enabled,
      enableFullscreenPopup: enabledFullscreenPopup,
      enablePopup: checked,
    });
  };

  const updateAuthors = (updatedAuthors: Author[]) => {
    const updatedSiteConfig = { ...siteConfig, authors: updatedAuthors };
    updateFilteredAuthors(updatedSiteConfig);
  };

  // Function to reset site settings to default
  const handleResetToDefault = () => {
    setOpenConfirmReset(true);
  };

  const confirmReset = async () => {
    // Reset authors to default for this site
    const defaultSiteConfig = initialFilteredAuthors.find(config => config.siteKey === siteConfig.siteKey);

    if (!defaultSiteConfig) {
      setOpenConfirmReset(false);
      return;
    }
    // 1) Update the locally stored site’s authors array to the default
    // (This reverts any custom authors the user added).
    await updateFilteredAuthors({
      ...defaultSiteConfig,
      authors: [...defaultSiteConfig.authors],
    });

    // 2) If DEI filtering is on, set each non-DEI author to "false" and each DEI author to "true"
    if (enableDEIFiltering) {
      const allSettings: ExtensionSettings = await getSettings();

      // Clone the existing authorPreferences
      const updatedPrefs = { ...allSettings.authorPreferences };

      defaultSiteConfig.authors.forEach(author => {
        const authorPrefKey = `${siteConfig.siteKey}:${author.name}`;
        if (author.dei) {
          updatedPrefs[authorPrefKey] = true;
        } else {
          updatedPrefs[authorPrefKey] = false;
        }
      });

      // Save it back
      const newSettings: ExtensionSettings = {
        ...allSettings,
        authorPreferences: updatedPrefs,
      };
      await saveSettings(newSettings);
    } else {
      // If DEI filtering is off, set them all to false
      const allSettings: ExtensionSettings = await getSettings();
      const updatedPrefs = { ...allSettings.authorPreferences };

      defaultSiteConfig.authors.forEach(author => {
        const authorPrefKey = `${siteConfig.siteKey}:${author.name}`;
        updatedPrefs[authorPrefKey] = false;
      });

      const newSettings: ExtensionSettings = {
        ...allSettings,
        authorPreferences: updatedPrefs,
      };
      await saveSettings(newSettings);
      await updateSiteSettings(
        siteConfig.siteKey,
        { enabled: false, enableFullscreenPopup: false, enablePopup: false },
        newSettings,
      );
    }

    setOpenConfirmReset(false);
  };

  const cancelReset = () => {
    setOpenConfirmReset(false);
  };

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {siteConfig.siteKey}
          </Typography>
          <Button variant="outlined" color="secondary" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
        </Box>
        <Box sx={{ display: 'flex' }}>
          <Tooltip
            title={
              enableDEIFiltering ? 'This toggle is locked because DEI Filtering is enabled in General Settings.' : ''
            }
            placement="top">
            <FormControlLabel
              control={<Switch checked={enabled} onChange={handleToggle} disabled={enableDEIFiltering} />}
              label={`Enable Filtering on ${siteConfig.siteKey}`}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex' }}>
          <Tooltip
            title="This hides content behind a fullscreen popup until acknowledged on a blocked author's article page."
            placement="top">
            <FormControlLabel
              control={<Switch checked={enabledFullscreenPopup} onChange={handleFullscreenToggle} />}
              label={`Enable Fullscreen Popup on ${siteConfig.siteKey}`}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex' }}>
          {' '}
          <Tooltip
            title="This displays a top-right popup notification on a blocked author's article page."
            placement="top">
            <FormControlLabel
              control={<Switch checked={enabledPopup} onChange={handlePopupToggle} />}
              label={`Enable Popup on ${siteConfig.siteKey}`}
            />
          </Tooltip>
        </Box>
        {enabled && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Reviewers:
            </Typography>
            <AuthorList
              siteKey={siteConfig.siteKey}
              authors={siteConfig.authors}
              updateAuthors={updateAuthors}
              selectedAuthor={selectedAuthor}
              selectedSiteKey={selectedSiteKey}
              onAuthorFocus={onAuthorFocus}
              enableDEIFiltering={enableDEIFiltering}
            />
          </>
        )}
      </Paper>
      <Dialog open={openConfirmReset} onClose={cancelReset}>
        <DialogTitle>Reset to Default</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset settings for {siteConfig.siteKey} to default values?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelReset}>Cancel</Button>
          <Button onClick={confirmReset} color="secondary">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SiteOption;
