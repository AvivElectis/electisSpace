import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * 404 Not Found Page
 * 
 * Displayed when users navigate to a non-existent route.
 */
export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    textAlign: 'center',
                    gap: 3,
                }}
            >
                <ErrorOutlineIcon
                    sx={{
                        fontSize: 120,
                        color: 'error.main',
                        opacity: 0.6,
                    }}
                />
                <Typography variant="h2" component="h1" gutterBottom>
                    404
                </Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                    Page Not Found
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    The page you're looking for doesn't exist or has been moved.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        size="large"
                    >
                        Go to Dashboard
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(-1)}
                        size="large"
                    >
                        Go Back
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}
