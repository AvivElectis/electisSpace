import { Box } from '@mui/material';
import { LogsViewer } from '@features/systemLogs/presentation/LogsViewer';

/**
 * Logs Viewer Tab
 * Display and filter application logs with persistent storage
 */
export function LogsViewerTab() {
    return (
        <Box sx={{ px: { xs: 0, sm: 2 }, height: '100%' }}>
            <LogsViewer />
        </Box>
    );
}
