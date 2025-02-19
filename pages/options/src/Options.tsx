import { withErrorBoundary, withSuspense } from '@extension/shared';
import type React from 'react';
import { useState } from 'react';
import { AppBar, Box, IconButton, Paper, Toolbar, Typography } from '@mui/material';
import GeneralSettings from './components/GeneralSettings';
import SiteSettings from './components/SiteSettings';
import Summary from './components/Summary';
import About from './components/About';
import logo from './assets/icon-128.png';

const Options: React.FC = () => {
  const [, setCurrentTab] = useState('general');
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | undefined>(undefined);
  const [selectedAuthor, setSelectedAuthor] = useState<string | undefined>(undefined);

  const handleSetCurrentTab = (tab: string, siteKey?: string, authorName?: string) => {
    setCurrentTab(tab);
    if (siteKey) {
      setSelectedSiteKey(siteKey);
    }
    if (authorName) {
      setSelectedAuthor(authorName);
    } else {
      setSelectedAuthor(undefined);
    }
  };

  return (
    <Box sx={{ height: '100vh', minWidth: 1280 }}>
      <Box sx={{ paddingTop: 2, justifyItems: 'center' }}>
        <Paper>
          <AppBar position="static">
            <Toolbar>
              <IconButton edge="start" disabled={true}>
                <img src={logo} alt="logo" width={30} height={30} />
              </IconButton>
              {/* Left side: your logo or extension name */}
              <Typography variant="h5" sx={{ flexGrow: 1 }}>
                Gamer's Choice Filter
              </Typography>
            </Toolbar>
          </AppBar>
        </Paper>
      </Box>
      <Box sx={{ display: 'flex' }}>
        <Box
          component="nav"
          sx={{
            width: { sm: 350 },
            flexShrink: { sm: 0 },
          }}>
          <Box
            sx={{
              width: 350,
              p: 2,
              overflowY: 'auto',
              position: 'fixed',
              height: '100%',
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            }}>
            <Summary setCurrentTab={handleSetCurrentTab} />
          </Box>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
          }}>
          <GeneralSettings />
          <SiteSettings
            selectedSiteKey={selectedSiteKey}
            selectedAuthor={selectedAuthor}
            onAuthorFocus={() => setSelectedAuthor(undefined)} // Reset after focusing
          />
        </Box>

        <Box
          component="nav"
          sx={{
            width: { sm: 350 },
            flexShrink: { sm: 0 },
          }}>
          <Box
            sx={{
              width: 350,
              p: 2,
              overflowY: 'auto',
              position: 'fixed',
              height: '100%',
              bgcolor: 'background.paper',
              borderLeft: '1px solid',
              borderColor: 'divider',
            }}>
            <About />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
