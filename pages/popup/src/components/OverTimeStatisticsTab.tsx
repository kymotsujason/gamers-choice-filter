import type { FC } from 'react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BlockedPostEntry {
  timestamp: string;
  count: number;
}

const OverTimeStatisticsTab: FC = () => {
  const [timeRange, setTimeRange] = useState('7');
  const [blockedPostsOverTime, setBlockedPostsOverTime] = useState<BlockedPostEntry[]>([]);

  useEffect(() => {
    chrome.storage.local.get(['blockedPostsOverTime'], data => {
      const overTimeData: BlockedPostEntry[] = data.blockedPostsOverTime || [];

      // Filter data to only entries within the selected time window
      const days = parseInt(timeRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const filtered = overTimeData.filter(entry => new Date(entry.timestamp) >= cutoff);

      setBlockedPostsOverTime(filtered);
    });
  }, [timeRange]);

  const handleRangeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTimeRange(event.target.value as string);
  };

  // ---------------------------------------------------------------------------
  // 1) Create a list of date strings for each day in the range.
  //    For example, if timeRange is "7", we make an array of the last 7 days.
  // ---------------------------------------------------------------------------
  const days = parseInt(timeRange, 10);
  const today = new Date();

  // We'll generate dates from oldest to newest:
  const dateLabels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateLabels.push(d.toLocaleDateString());
  }

  // ---------------------------------------------------------------------------
  // 2) Build a map from date string => blocked count, starting at 0 for all days
  // ---------------------------------------------------------------------------
  const dateToCount: Record<string, number> = {};
  dateLabels.forEach(dateStr => {
    dateToCount[dateStr] = 0;
  });

  // ---------------------------------------------------------------------------
  // 3) Aggregate the actual data into that map
  // ---------------------------------------------------------------------------
  blockedPostsOverTime.forEach(entry => {
    const dateStr = new Date(entry.timestamp).toLocaleDateString();
    if (dateStr in dateToCount) {
      dateToCount[dateStr] += entry.count;
    }
  });

  // ---------------------------------------------------------------------------
  // 4) Convert to an array that Recharts will consume. The array is in ascending
  //    chronological order because of how we constructed dateLabels above.
  // ---------------------------------------------------------------------------
  const chartData = dateLabels.map(dateStr => ({
    date: dateStr,
    count: dateToCount[dateStr],
  }));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Blocked Posts Over Time</Typography>

      <Box sx={{ mt: 1 }}>
        <Select value={timeRange} onChange={handleRangeChange} variant="outlined" size="small">
          <MenuItem value="7">Last 7 Days</MenuItem>
          <MenuItem value="14">Last 14 Days</MenuItem>
          <MenuItem value="30">Last 30 Days</MenuItem>
        </Select>
      </Box>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" name="Blocked Posts" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default OverTimeStatisticsTab;
