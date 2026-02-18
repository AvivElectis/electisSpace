import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Typography, Paper, Alert, AlertTitle } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { logger } from '@shared/infrastructure/services/logger';

interface Props {
    children: ReactNode;
    /** Optional fallback component to render when an error occurs */
    fallback?: ReactNode;
    /** Whether to show detailed error information */
    showDetails?: boolean;
    /** Optional callback when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Integrates with the logger service to track all caught errors.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to our logger service
        logger.error('Error', 'React Error Boundary caught error', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        });

        // Auto-reload once on stale chunk errors (e.g. after redeployment)
        if (this.isChunkLoadError(error)) {
            const lastReload = sessionStorage.getItem('chunk_error_reload');
            if (!lastReload || Date.now() - parseInt(lastReload, 10) > 10_000) {
                sessionStorage.setItem('chunk_error_reload', String(Date.now()));
                window.location.reload();
                return;
            }
        }

        // Update state with error info
        this.setState({ errorInfo });

        // Call optional callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    /** Detect chunk/module load failures caused by stale deployments */
    private isChunkLoadError(error: Error): boolean {
        const msg = error.message;
        return (
            msg.includes('Failed to fetch dynamically imported module') ||
            msg.includes('Loading chunk') ||
            msg.includes('Loading CSS chunk')
        );
    }

    handleReload = (): void => {
        logger.info('App', 'User triggered page reload after error');
        window.location.reload();
    };

    handleReset = (): void => {
        logger.info('App', 'User triggered error boundary reset');
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // If a custom fallback is provided, use it
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '50vh',
                        p: 3,
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            maxWidth: 600,
                            width: '100%',
                            textAlign: 'center',
                        }}
                    >
                        <BugReportIcon
                            sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
                        />
                        
                        <Typography variant="h5" gutterBottom>
                            Something went wrong
                        </Typography>
                        
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            An unexpected error has occurred. The error has been logged for review.
                        </Typography>

                        {this.props.showDetails && this.state.error && (
                            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                                <AlertTitle>Error Details</AlertTitle>
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        maxHeight: 200,
                                        overflow: 'auto',
                                    }}
                                >
                                    {this.state.error.message}
                                    {this.state.error.stack && (
                                        <>
                                            {'\n\nStack trace:\n'}
                                            {this.state.error.stack}
                                        </>
                                    )}
                                </Typography>
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={this.handleReset}
                            >
                                Try Again
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={this.handleReload}
                            >
                                Reload Page
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
