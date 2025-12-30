import { Box } from '@mui/material';
import { LogsViewer } from '@features/systemLogs/presentation/LogsViewer';

/**
 * Logs Viewer Tab
 * Display and filter application logs with persistent storage
 */
export function LogsViewerTab() {
    return (
        <Box sx={{ px: 2, height: '100%' }}>
            <LogsViewer />
        </Box>
    );
}
