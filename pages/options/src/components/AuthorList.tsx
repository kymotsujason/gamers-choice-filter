import type React from 'react';
import { useEffect, useState, useRef } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  TextField,
  IconButton,
  Box,
  Button,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Author } from '../data/filteredAuthors';
import type { ExtensionSettings } from '../utils/storage';
import { getSettings, saveSettings } from '../utils/storage';

interface AuthorListProps {
  siteKey: string;
  authors: Author[];
  updateAuthors: (updatedAuthors: Author[]) => void;
  selectedAuthor?: string;
  onAuthorFocus?: () => void;
  enableDEIFiltering: boolean;
}

const AuthorList: React.FC<AuthorListProps> = ({
  siteKey,
  authors,
  updateAuthors,
  selectedAuthor,
  onAuthorFocus,
  enableDEIFiltering,
}) => {
  const [authorPreferences, setAuthorPreferences] = useState<{ [key: string]: boolean }>({});
  const [newAuthorName, setNewAuthorName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const authorRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    // Load the entire settings to get authorPreferences
    getSettings().then(settings => {
      setAuthorPreferences(settings.authorPreferences || {});
    });
  }, []);

  useEffect(() => {
    if (selectedAuthor) {
      const authorKey = `${siteKey}-${selectedAuthor}`;
      const authorElement = authorRefs.current[authorKey];
      if (authorElement) {
        authorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        authorElement.style.backgroundColor = '#767676';
        setTimeout(() => {
          authorElement.style.backgroundColor = '';
        }, 2000);
      }
      // Call the onAuthorFocus callback to reset selectedAuthor
      if (onAuthorFocus) {
        onAuthorFocus();
      }
    }
  }, [onAuthorFocus, selectedAuthor, siteKey]);

  useEffect(() => {
    // Listen for changes in chrome.storage.local
    const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.authorPreferences && changes.authorPreferences.newValue) {
        setAuthorPreferences(changes.authorPreferences.newValue);
      }
    };

    chrome.storage.onChanged.addListener(storageChangeListener);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, []);

  const handleToggle = (authorName: string) => {
    const authorPrefKey = `${siteKey}:${authorName}`;
    const updatedPreferences = {
      ...authorPreferences,
      [authorPrefKey]: !authorPreferences[authorPrefKey],
    };

    setAuthorPreferences(updatedPreferences);

    // Update the settings with the new authorPreferences
    getSettings().then(settings => {
      const updatedSettings: ExtensionSettings = {
        ...settings,
        authorPreferences: updatedPreferences,
      };
      saveSettings(updatedSettings);
    });
  };

  const handleAddAuthor = () => {
    const trimmedName = newAuthorName.trim();
    if (trimmedName === '' || authors.some(author => author.name === trimmedName)) {
      return;
    }

    const updatedAuthors = [...authors, { name: trimmedName }];
    updateAuthors(updatedAuthors);
    setNewAuthorName('');
  };

  const handleRemoveAuthor = (authorName: string) => {
    const updatedAuthors = authors.filter(author => author.name !== authorName);
    updateAuthors(updatedAuthors);

    // Remove the author preference as well
    const authorPrefKey = `${siteKey}:${authorName}`;
    const updatedPreferences = { ...authorPreferences };
    delete updatedPreferences[authorPrefKey];
    setAuthorPreferences(updatedPreferences);

    // Update the settings with the new authorPreferences
    getSettings().then(settings => {
      const updatedSettings: ExtensionSettings = {
        ...settings,
        authorPreferences: updatedPreferences,
      };
      saveSettings(updatedSettings);
    });
  };

  const filteredAuthorsList = authors.filter(author => author.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <TextField
        label="Search Authors"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
      />
      <List>
        {filteredAuthorsList.map(author => {
          const authorPrefKey = `${siteKey}:${author.name}`;
          const isFiltered = authorPreferences[authorPrefKey] ? authorPreferences[authorPrefKey] === true : false; // Default to true
          const authorKey = `${siteKey}-${author.name}`;
          const isToggleDisabled = enableDEIFiltering && author.dei === true;
          const tooltipMessage = isToggleDisabled
            ? 'This toggle is locked because DEI Filtering is enabled in General Settings.'
            : '';

          return (
            <ListItem
              key={authorKey}
              component="div"
              ref={(el: HTMLDivElement | null) => {
                authorRefs.current[authorKey] = el;
              }}
              secondaryAction={
                <Tooltip title={tooltipMessage} placement="top">
                  <span>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveAuthor(author.name)}
                      disabled={isToggleDisabled} // Disable delete if toggle is disabled
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              }>
              <ListItemText primary={author.name} />
              <Tooltip title={tooltipMessage} placement="top">
                <FormControlLabel
                  control={
                    <Switch
                      checked={isFiltered}
                      onChange={() => handleToggle(author.name)}
                      disabled={isToggleDisabled} // Disable the switch
                    />
                  }
                  label="Filter"
                />
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <TextField
          label="Add New Author"
          value={newAuthorName}
          onChange={e => setNewAuthorName(e.target.value)}
          variant="outlined"
          fullWidth
        />
        <Button
          onClick={handleAddAuthor}
          variant="contained"
          color="primary"
          sx={{ ml: 2 }}
          disabled={newAuthorName.trim() === ''}>
          Add
        </Button>
      </Box>
    </>
  );
};

export default AuthorList;
