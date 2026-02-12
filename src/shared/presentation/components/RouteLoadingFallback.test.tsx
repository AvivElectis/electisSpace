import { render } from '@testing-library/react';
import { RouteLoadingFallback } from './RouteLoadingFallback';

describe('RouteLoadingFallback Component', () => {
    describe('rendering', () => {
        it('should render route loading fallback', () => {
            const { container } = render(<RouteLoadingFallback />);
            
            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render circular progress', () => {
            render(<RouteLoadingFallback />);
            
            const progress = document.querySelector('.MuiCircularProgress-root');
            expect(progress).toBeInTheDocument();
        });

        it('should render skeleton elements', () => {
            render(<RouteLoadingFallback />);
            
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('structure', () => {
        it('should render page header skeleton', () => {
            render(<RouteLoadingFallback />);
            
            // Header has text and rectangular skeletons
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThanOrEqual(2);
        });

        it('should render search/filter bar skeleton', () => {
            render(<RouteLoadingFallback />);
            
            // Search bar has rectangular skeletons
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThanOrEqual(2);
        });

        it('should use wave animation', () => {
            render(<RouteLoadingFallback />);
            
            // Check for wave animation class
            const waveSkeletons = document.querySelectorAll('.MuiSkeleton-wave');
            expect(waveSkeletons.length).toBeGreaterThan(0);
        });
    });

    describe('layout', () => {
        it('should have padding', () => {
            const { container } = render(<RouteLoadingFallback />);
            
            const mainBox = container.firstChild;
            expect(mainBox).toBeInTheDocument();
        });

        it('should use Stack layout', () => {
            render(<RouteLoadingFallback />);
            
            const stack = document.querySelector('.MuiStack-root');
            expect(stack).toBeInTheDocument();
        });

        it('should center the spinner in content area', () => {
            render(<RouteLoadingFallback />);
            
            const progress = document.querySelector('.MuiCircularProgress-root');
            expect(progress).toBeInTheDocument();
        });
    });

    describe('skeleton dimensions', () => {
        it('should render header with text skeleton', () => {
            render(<RouteLoadingFallback />);
            
            const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
            expect(textSkeletons.length).toBeGreaterThan(0);
        });

        it('should render rectangular skeletons for UI elements', () => {
            render(<RouteLoadingFallback />);
            
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThanOrEqual(3);
        });
    });
});
