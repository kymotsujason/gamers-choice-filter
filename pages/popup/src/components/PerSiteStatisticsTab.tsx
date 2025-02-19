import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PerSiteStatisticsTab: FC = () => {
  const [blockedPostsPerSite, setBlockedPostsPerSite] = useState<Record<string, number>>({});

  useEffect(() => {
    chrome.storage.local.get(['blockedPostsPerSite'], data => {
      setBlockedPostsPerSite(data.blockedPostsPerSite || {});
    });
  }, []);

  // Convert the object into an array for Recharts
  const siteData = Object.entries(blockedPostsPerSite).map(([siteKey, count]) => ({
    siteKey,
    count,
  }));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Blocked Posts Per Website</Typography>

      {/* 
        By using layout="vertical", the bar chart becomes a horizontal bar chart:
        - The X-axis is numeric (count)
        - The Y-axis is categories (website keys)
        - This avoids issues with many site keys horizontally
      */}
      <ResponsiveContainer width="100%" height={248}>
        <BarChart
          data={siteData}
          layout="vertical" // This is crucial for a horizontal bar chart
        >
          <XAxis type="number" />
          {/* 
            Since layout="vertical", the Y-axis is 'category' type and keyed by 'siteKey'.
            If you have a lot of site names, you might want to handle label styling or truncation.
          */}
          <YAxis dataKey="siteKey" type="category" width={48} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="Blocked Posts" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PerSiteStatisticsTab;
