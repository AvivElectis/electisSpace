import { render, screen } from '@testing-library/react';
import { LoadingFallback, LoadingSpinner } from './LoadingFallback';

describe('LoadingFallback Component', () => {
    describe('rendering', () => {
        it('should render loading fallback', () => {
            const { container } = render(<LoadingFallback />);
            
            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render loading text', () => {
            render(<LoadingFallback />);
            
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should render circular progress', () => {
            render(<LoadingFallback />);
            
            const progress = document.querySelector('.MuiCircularProgress-root');
            expect(progress).toBeInTheDocument();
        });
    });

    describe('structure', () => {
        it('should render header skeleton', () => {
            render(<LoadingFallback />);
            
            // Header skeleton (64px height)
            const skeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(skeletons.length).toBeGreaterThanOrEqual(1);
        });

        it('should render tabs skeleton', () => {
            render(<LoadingFallback />);
            
            // Multiple rectangular skeletons for header and tabs
            const skeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(skeletons.length).toBeGreaterThanOrEqual(2);
        });

        it('should fill viewport height', () => {
            const { container } = render(<LoadingFallback />);
            
            const mainBox = container.firstChild;
            expect(mainBox).toHaveStyle({ minHeight: '100vh' });
        });
    });

    describe('layout', () => {
        it('should use flex column layout', () => {
            const { container } = render(<LoadingFallback />);
            
            const mainBox = container.firstChild;
            expect(mainBox).toHaveStyle({ 
                display: 'flex',
                flexDirection: 'column'
            });
        });

        it('should center content area', () => {
            render(<LoadingFallback />);
            
            // Content should have CircularProgress and text centered
            const progress = document.querySelector('.MuiCircularProgress-root');
            expect(progress).toBeInTheDocument();
        });
    });
});

describe('LoadingSpinner Component', () => {
    describe('rendering', () => {
        it('should render loading spinner', () => {
            const { container } = render(<LoadingSpinner />);
            
            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render circular progress', () => {
            render(<LoadingSpinner />);
            
            const progress = document.querySelector('.MuiCircularProgress-root');
            expect(progress).toBeInTheDocument();
        });

        it('should center the spinner', () => {
            const { container } = render(<LoadingSpinner />);
            
            const box = container.firstChild;
            expect(box).toHaveStyle({ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            });
        });
    });

    describe('minimal layout', () => {
        it('should not render any text', () => {
            render(<LoadingSpinner />);
            
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        it('should not render skeletons', () => {
            render(<LoadingSpinner />);
            
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBe(0);
        });

        it('should have padding', () => {
            const { container } = render(<LoadingSpinner />);
            
            const box = container.firstChild;
            expect(box).toBeInTheDocument();
        });
    });
});
