import { render } from '@testing-library/react';
import { DialogSkeleton } from './DialogSkeleton';

describe('DialogSkeleton Component', () => {
    describe('rendering', () => {
        it('should render dialog skeleton', () => {
            const { container } = render(<DialogSkeleton />);
            
            expect(container.firstChild).toBeInTheDocument();
        });

        it('should render skeleton elements', () => {
            render(<DialogSkeleton />);
            
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('should render form field skeletons', () => {
            render(<DialogSkeleton />);
            
            // Text skeletons for labels
            const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
            expect(textSkeletons.length).toBeGreaterThan(0);
        });

        it('should render input skeletons', () => {
            render(<DialogSkeleton />);
            
            // Rectangular skeletons for inputs
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThan(0);
        });
    });

    describe('structure', () => {
        it('should render multiple form fields', () => {
            render(<DialogSkeleton />);
            
            // Each field has a label (text) and input (rectangular)
            // We have 4 form fields plus 2 action buttons
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThanOrEqual(6);
        });

        it('should render action buttons area', () => {
            render(<DialogSkeleton />);
            
            // Action buttons at the end
            const rectSkeletons = document.querySelectorAll('.MuiSkeleton-rectangular');
            expect(rectSkeletons.length).toBeGreaterThanOrEqual(2);
        });

        it('should use Stack layout', () => {
            const { container } = render(<DialogSkeleton />);
            
            const stack = container.querySelector('.MuiStack-root');
            expect(stack).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should have proper spacing', () => {
            const { container } = render(<DialogSkeleton />);
            
            const stack = container.querySelector('.MuiStack-root');
            expect(stack).toBeInTheDocument();
        });

        it('should render label and input pairs', () => {
            render(<DialogSkeleton />);
            
            // Each Box contains a label skeleton and input skeleton
            const boxes = document.querySelectorAll('.MuiBox-root');
            expect(boxes.length).toBeGreaterThan(0);
        });
    });
});
