import { render } from '@testing-library/react';
import { CardSkeleton } from './CardSkeleton';

describe('CardSkeleton Component', () => {
    describe('rendering', () => {
        it('should render skeleton cards', () => {
            render(<CardSkeleton />);
            
            // Check for skeleton elements
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('should render default 6 cards', () => {
            render(<CardSkeleton />);
            
            // Each card has a MuiCard-root class
            const cards = document.querySelectorAll('.MuiCard-root');
            expect(cards.length).toBe(6);
        });

        it('should render specified count of cards', () => {
            render(<CardSkeleton count={3} />);
            
            const cards = document.querySelectorAll('.MuiCard-root');
            expect(cards.length).toBe(3);
        });

        it('should render with custom height', () => {
            const { container } = render(<CardSkeleton count={1} height={300} />);
            
            const card = container.querySelector('.MuiCard-root');
            expect(card).toHaveStyle({ height: '300px' });
        });
    });

    describe('skeleton structure', () => {
        it('should include title skeleton', () => {
            render(<CardSkeleton count={1} />);
            
            // Title skeleton is wider (70%)
            const skeletons = document.querySelectorAll('.MuiSkeleton-text');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('should include content skeletons', () => {
            render(<CardSkeleton count={1} />);
            
            // Multiple text skeletons for content
            const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
            expect(textSkeletons.length).toBeGreaterThanOrEqual(3);
        });

        it('should include action button skeletons', () => {
            render(<CardSkeleton count={1} />);
            
            // Rectangular skeletons for buttons
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThan(0);
        });
    });

    describe('layout', () => {
        it('should render in grid layout', () => {
            const { container } = render(<CardSkeleton />);
            
            const gridBox = container.firstChild;
            expect(gridBox).toHaveStyle({ display: 'grid' });
        });

        it('should render multiple cards for larger counts', () => {
            render(<CardSkeleton count={10} />);
            
            const cards = document.querySelectorAll('.MuiCard-root');
            expect(cards.length).toBe(10);
        });

        it('should render zero cards when count is 0', () => {
            render(<CardSkeleton count={0} />);
            
            const cards = document.querySelectorAll('.MuiCard-root');
            expect(cards.length).toBe(0);
        });
    });
});
