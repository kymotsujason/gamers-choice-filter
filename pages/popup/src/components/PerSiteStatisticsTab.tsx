import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { name: string; size: number } }[];
  label?: string;
}

const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const { name, size } = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: 'black',
          border: '1px solid #ccc',
          padding: '5px',
          color: 'white',
        }}>
        <p style={{ margin: 0, fontWeight: 500 }}>{name}</p>
        <p style={{ margin: 0 }}>{`Blocked Posts: ${size}`}</p>
      </div>
    );
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomizedContent: FC<any> = props => {
  const { x, y, width, height, name } = props;
  const label = typeof name === 'string' ? name : '';
  const dynamicFontSize = Math.max(Math.min(width) * 0.18, 10);

  // For very small tiles, only render the rectangle.
  if (width < 40 || height < 20) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} stroke="#fff" fill="#1e45b7" />
      </g>
    );
  }

  // Calculate a maximum number of characters to display, average character width is ~0.6
  const maxChars = Math.floor((width - 4) / (dynamicFontSize * 0.6));
  const textToDisplay = label.length > maxChars ? label.substring(0, maxChars) + '…' : label;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} stroke="#fff" fill="#1e45b7" />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        style={{ fontSize: dynamicFontSize, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {textToDisplay}
      </text>
    </g>
  );
};

const PerSiteStatisticsTab: FC = () => {
  const [blockedPostsPerSite, setBlockedPostsPerSite] = useState<Record<string, number>>({});

  useEffect(() => {
    chrome.storage.local.get(['blockedPostsPerSite'], data => {
      setBlockedPostsPerSite(data.blockedPostsPerSite || {});
    });
  }, []);

  const treemapData = Object.entries(blockedPostsPerSite).map(([site, count]) => ({
    name: site,
    size: count,
  }));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Blocked Posts Per Website</Typography>
      <ResponsiveContainer width="100%" height={248}>
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          content={<CustomizedContent />}
          animationDuration={500}>
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </Box>
  );
};

export default PerSiteStatisticsTab;
