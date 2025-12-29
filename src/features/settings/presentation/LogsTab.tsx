import React from 'react';
import { Box } from '@mui/material';
import { LogsViewer } from '@features/systemLogs/presentation/LogsViewer';

/**
 * Logs Tab Component
 * Displays application logs with filtering and export capabilities
 */
export const LogsTab: React.FC = () => {
    return (
        <Box sx={{ height: '100%', p: 2 }}>
            <LogsViewer />
        </Box>
    );
};
