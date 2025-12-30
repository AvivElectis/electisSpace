import { Box, Skeleton, Stack } from '@mui/material';

/**
 * Skeleton loader for dialog content
 * Displays animated placeholder while dialog content loads
 * 
 * @example
 * <Dialog open={open}>
 *   <DialogTitle>Settings</DialogTitle>
 *   <DialogContent>
 *     {loading ? <DialogSkeleton /> : <SettingsForm />}
 *   </DialogContent>
 * </Dialog>
 */
export function DialogSkeleton() {
    return (
        <Stack gap={3} sx={{ py: 2 }}>
            {/* Form field 1 */}
            <Box>
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
            </Box>

            {/* Form field 2 */}
            <Box>
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
            </Box>

            {/* Form field 3 */}
            <Box>
                <Skeleton variant="text" width="35%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
            </Box>

            {/* Form field 4 */}
            <Box>
                <Skeleton variant="text" width="45%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={100} />
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Skeleton variant="rectangular" width={100} height={40} />
                <Skeleton variant="rectangular" width={100} height={40} />
            </Box>
        </Stack>
    );
}
