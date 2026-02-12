/**
 * FilterDrawer Component Tests
 * Phase 10.28 - Deep Testing System
 * 
 * Tests the filter drawer for data filtering
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import { FilterDrawer, type FilterField } from './FilterDrawer';

describe('FilterDrawer Component', () => {
    const mockFilters: FilterField[] = [
        {
            id: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            value: '',
        },
        {
            id: 'category',
            label: 'Category',
            options: [
                { label: 'Engineering', value: 'eng' },
                { label: 'Marketing', value: 'mkt' },
            ],
            value: '',
        },
    ];

    const mockOnClose = vi.fn();
    const mockOnFilterChange = vi.fn();
    const mockOnApply = vi.fn();
    const mockOnReset = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render when open', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('Filters')).toBeInTheDocument();
        });

        it('should not render when closed', () => {
            render(
                <FilterDrawer
                    open={false}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            // Drawer content should not exist when closed
            expect(screen.queryByText('Filters')).not.toBeInTheDocument();
        });

        it('should render all filter fields', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            // MUI Select uses combobox role
            const comboboxes = screen.getAllByRole('combobox');
            expect(comboboxes.length).toBe(2);
            
            // Check labels exist as text (MUI renders in both label and legend)
            expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Category').length).toBeGreaterThanOrEqual(1);
        });

        it('should render filter icon', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByTestId('FilterListIcon')).toBeInTheDocument();
        });
    });

    describe('close functionality', () => {
        it('should call onClose when close button clicked', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            fireEvent.click(screen.getByTestId('CloseIcon').parentElement!);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('filter actions', () => {
        it('should disable Apply when no filters are active', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('Apply Filters')).toBeDisabled();
        });

        it('should disable Reset when no filters are active', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('Reset All')).toBeDisabled();
        });

        it('should enable Apply when filters are active', () => {
            const activeFilters: FilterField[] = [
                { ...mockFilters[0], value: 'active' },
                mockFilters[1],
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={activeFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('Apply Filters')).not.toBeDisabled();
        });

        it('should call onApply when Apply button clicked', () => {
            const activeFilters: FilterField[] = [
                { ...mockFilters[0], value: 'active' },
                mockFilters[1],
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={activeFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            fireEvent.click(screen.getByText('Apply Filters'));

            expect(mockOnApply).toHaveBeenCalled();
        });

        it('should call onReset when Reset button clicked', () => {
            const activeFilters: FilterField[] = [
                { ...mockFilters[0], value: 'active' },
                mockFilters[1],
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={activeFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            fireEvent.click(screen.getByText('Reset All'));

            expect(mockOnReset).toHaveBeenCalled();
        });
    });

    describe('active filter count', () => {
        it('should not show chip when no filters active', () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        it('should show chip with count when filters active', () => {
            const activeFilters: FilterField[] = [
                { ...mockFilters[0], value: 'active' },
                { ...mockFilters[1], value: 'eng' },
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={activeFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('should count array filters correctly', () => {
            const multiFilters: FilterField[] = [
                {
                    id: 'tags',
                    label: 'Tags',
                    options: [
                        { label: 'Tag1', value: 'tag1' },
                        { label: 'Tag2', value: 'tag2' },
                    ],
                    value: ['tag1', 'tag2'],
                    multiple: true,
                },
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={multiFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            expect(screen.getByText('1')).toBeInTheDocument();
        });

        it('should not count empty array filters', () => {
            const emptyArrayFilters: FilterField[] = [
                {
                    id: 'tags',
                    label: 'Tags',
                    options: [
                        { label: 'Tag1', value: 'tag1' },
                    ],
                    value: [],
                    multiple: true,
                },
            ];

            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={emptyArrayFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            // No chip should be visible when count is 0
            const header = screen.getByText('Filters').parentElement;
            expect(within(header!).queryByText('0')).not.toBeInTheDocument();
        });
    });

    describe('select interaction', () => {
        it('should include "All" option for single select', async () => {
            render(
                <FilterDrawer
                    open={true}
                    onClose={mockOnClose}
                    filters={mockFilters}
                    onFilterChange={mockOnFilterChange}
                    onApply={mockOnApply}
                    onReset={mockOnReset}
                />
            );

            // Open the status select using combobox role
            const comboboxes = screen.getAllByRole('combobox');
            fireEvent.mouseDown(comboboxes[0]);

            // Check for "All" option
            expect(await screen.findByText('All')).toBeInTheDocument();
        });
    });
});
