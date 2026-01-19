/**
 * EmptyState Component Tests
 * Phase 10.25 - Deep Testing System
 * 
 * Tests the EmptyState component for displaying empty data states
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

describe('EmptyState Component', () => {
    describe('rendering', () => {
        it('should render with title only', () => {
            render(<EmptyState title="No data available" />);

            expect(screen.getByText('No data available')).toBeInTheDocument();
        });

        it('should render with title and description', () => {
            render(
                <EmptyState
                    title="No items found"
                    description="Try adjusting your filters or add new items."
                />
            );

            expect(screen.getByText('No items found')).toBeInTheDocument();
            expect(screen.getByText('Try adjusting your filters or add new items.')).toBeInTheDocument();
        });

        it('should render with icon', () => {
            render(
                <EmptyState
                    title="Empty folder"
                    icon={<FolderOpenIcon data-testid="folder-icon" />}
                />
            );

            expect(screen.getByTestId('folder-icon')).toBeInTheDocument();
        });

        it('should render without icon when not provided', () => {
            const { container } = render(<EmptyState title="No data" />);

            expect(container.querySelector('svg')).toBeNull();
        });
    });

    describe('primary action', () => {
        it('should render action button when actionLabel and onAction provided', () => {
            const handleAction = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    actionLabel="Add Item"
                    onAction={handleAction}
                />
            );

            expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
        });

        it('should call onAction when action button clicked', () => {
            const handleAction = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    actionLabel="Add Item"
                    onAction={handleAction}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

            expect(handleAction).toHaveBeenCalledTimes(1);
        });

        it('should not render action button when only actionLabel provided', () => {
            render(
                <EmptyState
                    title="No items"
                    actionLabel="Add Item"
                />
            );

            expect(screen.queryByRole('button', { name: 'Add Item' })).not.toBeInTheDocument();
        });

        it('should not render action button when only onAction provided', () => {
            const handleAction = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    onAction={handleAction}
                />
            );

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    describe('secondary action', () => {
        it('should render secondary action button', () => {
            const handleSecondary = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    secondaryActionLabel="Learn More"
                    onSecondaryAction={handleSecondary}
                />
            );

            expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
        });

        it('should call onSecondaryAction when clicked', () => {
            const handleSecondary = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    secondaryActionLabel="Learn More"
                    onSecondaryAction={handleSecondary}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: 'Learn More' }));

            expect(handleSecondary).toHaveBeenCalledTimes(1);
        });

        it('should render both primary and secondary actions', () => {
            const handlePrimary = vi.fn();
            const handleSecondary = vi.fn();
            render(
                <EmptyState
                    title="No items"
                    actionLabel="Add Item"
                    onAction={handlePrimary}
                    secondaryActionLabel="Import"
                    onSecondaryAction={handleSecondary}
                />
            );

            expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
        });
    });

    describe('accessibility', () => {
        it('should have accessible title text', () => {
            render(<EmptyState title="No results" />);

            const heading = screen.getByText('No results');
            expect(heading).toBeVisible();
        });

        it('should have accessible buttons', () => {
            const handleAction = vi.fn();
            render(
                <EmptyState
                    title="No data"
                    actionLabel="Create New"
                    onAction={handleAction}
                />
            );

            const button = screen.getByRole('button', { name: 'Create New' });
            expect(button).toBeEnabled();
        });
    });
});
