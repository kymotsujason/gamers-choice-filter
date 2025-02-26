import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Link,
  Badge,
  Collapse,
  IconButton,
  TextField,
} from '@mui/material';
import type { ExtensionSettings } from '../utils/storage';
import { getSettings } from '../utils/storage';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SiteConfig } from '../data/filteredAuthors';

interface SummaryProps {
  setCurrentTab: (siteKey?: string, authorName?: string) => void;
}

const Summary: React.FC<SummaryProps> = ({ setCurrentTab }) => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [expandedSites, setExpandedSites] = useState<{ [siteKey: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Function to load settings
    const loadSettings = () => {
      getSettings().then(data => {
        setSettings(data);
      });
    };

    // Initial load
    loadSettings();

    // Listen for changes in chrome.storage.local
    const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        loadSettings();
      }
    };

    chrome.storage.onChanged.addListener(storageChangeListener);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageChangeListener);
    };
  }, []);

  if (!settings) {
    return null;
  }

  const { sites, authorPreferences, filteredAuthors } = settings;

  // Prepare a list of enabled sites
  const enabledSites = filteredAuthors.filter(siteConfig => {
    const siteKey = siteConfig.siteKey;
    return sites[siteKey]?.enabled ? sites[siteKey]?.enabled === true : false; // Defaults to true
  });

  // Filter sites and authors based on the search query
  const filteredSites = enabledSites
    .map(siteConfig => {
      const siteKey = siteConfig.siteKey;

      // Filter authors based on the search query
      const filteredAuthorsList = siteConfig.authors.filter(author => {
        const authorPrefKey = `${siteKey}:${author.name}`;
        // Only include authors whose filtering is enabled and match the search query
        const isFiltered = authorPreferences[authorPrefKey] ? authorPreferences[authorPrefKey] === true : false; // Defaults to true
        const matchesSearch =
          author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          siteKey.toLowerCase().includes(searchQuery.toLowerCase());
        return isFiltered && matchesSearch;
      });

      // Determine if the site matches the search query based on site name or authors
      const siteMatchesSearch = siteKey.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingAuthors = filteredAuthorsList.length > 0;

      if (siteMatchesSearch || hasMatchingAuthors) {
        return {
          ...siteConfig,
          authors: filteredAuthorsList,
        };
      } else {
        return null; // Exclude sites that don't match the search query
      }
    })
    .filter(siteConfig => siteConfig !== null) as SiteConfig[]; // Type assertion

  // Generate the summary content
  const summaryContent = filteredSites.map(siteConfig => {
    const siteKey = siteConfig.siteKey;
    const siteAuthors = siteConfig.authors;

    const isExpanded = expandedSites[siteKey] || false;

    const handleSiteClick = () => {
      setCurrentTab(siteKey, undefined);
    };

    const toggleExpand = () => {
      setExpandedSites(prev => ({
        ...prev,
        [siteKey]: !isExpanded,
      }));
    };

    return (
      <div key={siteKey}>
        <ListItem
          onClick={handleSiteClick}
          secondaryAction={
            <IconButton edge="end" onClick={toggleExpand} size="small">
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          }>
          <ListItemText
            primary={
              <Badge
                badgeContent={siteAuthors.length}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    right: -14,
                    top: 9,
                  },
                }}>
                <Link href="#" onClick={handleSiteClick} underline="none">
                  {siteKey}
                </Link>
              </Badge>
            }
          />
        </ListItem>
        <Collapse in={!isExpanded} timeout="auto" unmountOnExit>
          {siteAuthors.length > 0 ? (
            <List component="div" disablePadding dense sx={{ pl: 2 }}>
              {siteAuthors.map(author => (
                <ListItem
                  key={`${siteKey}-${author.name}`}
                  onClick={() => {
                    setCurrentTab(siteKey, author.name);
                  }}
                  sx={{ cursor: 'pointer' }}>
                  <ListItemText primary={author.name} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ pl: 4 }}>
              No reviewers are being filtered on this site.
            </Typography>
          )}
        </Collapse>
      </div>
    );
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom align="center">
        Filter Summary
      </Typography>
      <TextField
        label="Search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        variant="outlined"
        fullWidth
      />
      <Typography variant="caption" gutterBottom align="center">
        Click a reviewer or website to quickly navigate
      </Typography>
      {filteredSites.length > 0 ? (
        <List dense>{summaryContent}</List>
      ) : (
        <Typography variant="body2" color="textSecondary">
          No matching sites or reviewers found.
        </Typography>
      )}
    </Paper>
  );
};

export default Summary;
