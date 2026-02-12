import { render } from '@testing-library/react';
import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton Component', () => {
    describe('rendering', () => {
        it('should render table skeleton', () => {
            render(<TableSkeleton />);
            
            const table = document.querySelector('table');
            expect(table).toBeInTheDocument();
        });

        it('should render default 5 rows', () => {
            render(<TableSkeleton />);
            
            const rows = document.querySelectorAll('tbody tr');
            expect(rows.length).toBe(5);
        });

        it('should render default 6 columns', () => {
            render(<TableSkeleton />);
            
            // First body row should have 6 cells
            const firstRow = document.querySelector('tbody tr');
            const cells = firstRow?.querySelectorAll('td');
            expect(cells?.length).toBe(6);
        });

        it('should render specified number of rows', () => {
            render(<TableSkeleton rows={10} />);
            
            const rows = document.querySelectorAll('tbody tr');
            expect(rows.length).toBe(10);
        });

        it('should render specified number of columns', () => {
            render(<TableSkeleton columns={4} />);
            
            const firstRow = document.querySelector('tbody tr');
            const cells = firstRow?.querySelectorAll('td');
            expect(cells?.length).toBe(4);
        });
    });

    describe('header', () => {
        it('should show header by default', () => {
            render(<TableSkeleton />);
            
            const header = document.querySelector('thead');
            expect(header).toBeInTheDocument();
        });

        it('should hide header when showHeader is false', () => {
            render(<TableSkeleton showHeader={false} />);
            
            const header = document.querySelector('thead');
            expect(header).not.toBeInTheDocument();
        });

        it('should render header with correct column count', () => {
            render(<TableSkeleton columns={4} />);
            
            const headerRow = document.querySelector('thead tr');
            const headerCells = headerRow?.querySelectorAll('th');
            expect(headerCells?.length).toBe(4);
        });
    });

    describe('skeleton elements', () => {
        it('should include skeleton elements in cells', () => {
            render(<TableSkeleton rows={2} columns={2} />);
            
            const skeletons = document.querySelectorAll('.MuiSkeleton-root');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('should render text variant skeletons', () => {
            render(<TableSkeleton />);
            
            const textSkeletons = document.querySelectorAll('.MuiSkeleton-text');
            expect(textSkeletons.length).toBeGreaterThan(0);
        });

        it('should render header skeletons when header shown', () => {
            render(<TableSkeleton columns={3} />);
            
            const headerCells = document.querySelectorAll('thead th');
            headerCells.forEach((cell) => {
                const skeleton = cell.querySelector('.MuiSkeleton-root');
                expect(skeleton).toBeInTheDocument();
            });
        });
    });

    describe('customization', () => {
        it('should handle single row', () => {
            render(<TableSkeleton rows={1} />);
            
            const rows = document.querySelectorAll('tbody tr');
            expect(rows.length).toBe(1);
        });

        it('should handle single column', () => {
            render(<TableSkeleton columns={1} />);
            
            const firstRow = document.querySelector('tbody tr');
            const cells = firstRow?.querySelectorAll('td');
            expect(cells?.length).toBe(1);
        });

        it('should handle zero rows', () => {
            render(<TableSkeleton rows={0} />);
            
            const rows = document.querySelectorAll('tbody tr');
            expect(rows.length).toBe(0);
        });

        it('should render many rows and columns', () => {
            render(<TableSkeleton rows={20} columns={10} />);
            
            const rows = document.querySelectorAll('tbody tr');
            expect(rows.length).toBe(20);
            
            const firstRow = document.querySelector('tbody tr');
            const cells = firstRow?.querySelectorAll('td');
            expect(cells?.length).toBe(10);
        });
    });
});
