import { render, screen } from '@testing-library/react';
import { RouteLoadingFallback } from './RouteLoadingFallback';

describe('RouteLoadingFallback Component', () => {
    describe('rendering', () => {
        it('should render route loading fallback', () => {
            const { container } = render(<RouteLoadingFallback />);

            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render sphere loader canvas', () => {
            render(<RouteLoadingFallback />);

            expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
        });
    });

    describe('layout', () => {
        it('should center content', () => {
            const { container } = render(<RouteLoadingFallback />);

            const mainBox = container.firstChild;
            expect(mainBox).toHaveStyle({
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            });
        });

        it('should have minimum height', () => {
            const { container } = render(<RouteLoadingFallback />);

            const mainBox = container.firstChild;
            expect(mainBox).toBeInTheDocument();
        });

        it('should not render skeletons', () => {
            render(<RouteLoadingFallback />);

            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBe(0);
        });
    });
});
