/* eslint-disable react-hooks/rules-of-hooks */
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BlockedPostEntry {
  timestamp: string;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: {
      count: number;
    };
  }[];
  label?: string;
}

const CustomLineTooltip: FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: 'black',
          border: '1px solid #ccc',
          padding: '8px',
          color: 'white',
        }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0 }}>Blocked Posts: {data.count}</p>
      </div>
    );
  }
  return null;
};

const OverTimeStatisticsTab: FC = () => {
  const [timeRange, setTimeRange] = useState('7');
  const [blockedPostsOverTime, setBlockedPostsOverTime] = useState<BlockedPostEntry[]>([]);

  useEffect(() => {
    chrome.storage.local.get(['blockedPostsOverTime'], data => {
      const overTimeData: BlockedPostEntry[] = data.blockedPostsOverTime || [];

      const days = parseInt(timeRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const filtered = overTimeData.filter(entry => new Date(entry.timestamp) >= cutoff);
      setBlockedPostsOverTime(filtered);
    });
  }, [timeRange]);

  const handleRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value as string);
  };

  const days = parseInt(timeRange, 10);
  const today = new Date();

  const dateLabels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateLabels.push(d.toLocaleDateString());
  }

  const dateToCount: Record<string, number> = {};
  dateLabels.forEach(dateStr => {
    dateToCount[dateStr] = 0;
  });

  blockedPostsOverTime.forEach(entry => {
    const dateStr = new Date(entry.timestamp).toLocaleDateString();
    if (dateStr in dateToCount) {
      dateToCount[dateStr] += entry.count;
    }
  });

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
          <Tooltip content={<CustomLineTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="count" name="Blocked Posts" stroke="#8884d8" animationDuration={500} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default OverTimeStatisticsTab;
