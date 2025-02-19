import type React from 'react';
import { Typography, Paper, IconButton } from '@mui/material';
import kofi from '../assets/kofi.png';
import GitHubIcon from '@mui/icons-material/GitHub';

const About: React.FC = () => {
  const handleOpenKofi = () => {
    chrome.tabs.create({ url: 'https://ko-fi.com/kymotsujason' });
  };

  const handleOpenGithub = () => {
    chrome.tabs.create({ url: 'https://github.com/kymotsujason/gamers-choice-filter' });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        About
      </Typography>
      <Typography variant="body1" gutterBottom>
        Take control of your favorite gaming review websites with this customizable filter tool by hiding reviews from
        those you disagree with. All you have to do is:
      </Typography>
      <Typography variant="body1" gutterBottom>
        *Enable the DEI Filter to immediately hide reviews that don't resonate with the gaming comunity
      </Typography>
      <Typography variant="body1" gutterBottom>
        or:
      </Typography>
      <Typography variant="body1" gutterBottom>
        1. Select the website you want to filter
      </Typography>
      <Typography variant="body1" gutterBottom>
        2. Enable the filter for that website
      </Typography>
      <Typography variant="body1" gutterBottom>
        3. Enable the filter for the reviewers you want dislike
      </Typography>
      <br />
      <Typography variant="body1" gutterBottom>
        If you like this tool, donate to support it. Report bugs or suggest features on GitHub.
      </Typography>
      <IconButton onClick={handleOpenKofi}>
        <img src={kofi} alt="logo" width={32} height={32} />
      </IconButton>
      <GitHubIcon onClick={handleOpenGithub} />
    </Paper>
  );
};

export default About;
