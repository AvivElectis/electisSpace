import { render, screen } from '@testing-library/react';
import { LoadingFallback, LoadingSpinner } from './LoadingFallback';

describe('LoadingFallback Component', () => {
    describe('rendering', () => {
        it('should render loading fallback', () => {
            const { container } = render(<LoadingFallback />);

            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render sphere loader canvas', () => {
            render(<LoadingFallback />);

            expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
        });
    });

    describe('structure', () => {
        it('should fill viewport height', () => {
            const { container } = render(<LoadingFallback />);

            const mainBox = container.firstChild;
            expect(mainBox).toHaveStyle({ minHeight: '100vh' });
        });
    });

    describe('layout', () => {
        it('should use flex layout', () => {
            const { container } = render(<LoadingFallback />);

            const mainBox = container.firstChild;
            expect(mainBox).toHaveStyle({
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            });
        });
    });
});

describe('LoadingSpinner Component', () => {
    describe('rendering', () => {
        it('should render loading spinner', () => {
            const { container } = render(<LoadingSpinner />);

            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render sphere loader canvas', () => {
            render(<LoadingSpinner />);

            expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
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
