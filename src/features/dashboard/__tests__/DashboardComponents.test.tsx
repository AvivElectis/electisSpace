/**
 * Dashboard Components Tests
 * 
 * Tests for dashboard UI components including:
 * - DashboardStatusChip
 * - DashboardAppInfoCard
 * - DashboardSpacesCard
 * - DashboardPeopleCard
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils/testUtils';
import { DashboardStatusChip } from '../components/DashboardStatusChip';
import { DashboardAppInfoCard } from '../components/DashboardAppInfoCard';
import { DashboardSpacesCard } from '../components/DashboardSpacesCard';
import { DashboardConferenceCard } from '../components/DashboardConferenceCard';
import { DashboardPeopleCard } from '../components/DashboardPeopleCard';
import SyncIcon from '@mui/icons-material/Sync';

describe('Dashboard Components', () => {
    describe('DashboardStatusChip', () => {
        it('should render with label', () => {
            render(
                <DashboardStatusChip label="Test Status" color="success" />
            );

            expect(screen.getByText('Test Status')).toBeInTheDocument();
        });

        it('should render with different colors', () => {
            const { rerender } = render(
                <DashboardStatusChip label="Success" color="success" />
            );
            expect(screen.getByText('Success')).toBeInTheDocument();

            rerender(<DashboardStatusChip label="Error" color="error" />);
            expect(screen.getByText('Error')).toBeInTheDocument();

            rerender(<DashboardStatusChip label="Warning" color="warning" />);
            expect(screen.getByText('Warning')).toBeInTheDocument();
        });

        it('should render with icon', () => {
            render(
                <DashboardStatusChip
                    label="With Icon"
                    color="info"
                    icon={<SyncIcon data-testid="sync-icon" />}
                />
            );

            expect(screen.getByText('With Icon')).toBeInTheDocument();
            expect(screen.getByTestId('sync-icon')).toBeInTheDocument();
        });
    });

    describe('DashboardAppInfoCard', () => {
        const defaultProps = {
            workingMode: 'SFTP',
            spaceType: 'office',
            spaceTypeLabel: 'Office',
            autoSyncEnabled: true,
            syncInterval: 60,
            lastSync: new Date(),
        };

        it('should render application info title', () => {
            render(<DashboardAppInfoCard {...defaultProps} />);

            expect(screen.getByText(/application info/i)).toBeInTheDocument();
        });

        it('should display SFTP mode', () => {
            render(<DashboardAppInfoCard {...defaultProps} />);

            expect(screen.getByText(/SFTP/i)).toBeInTheDocument();
        });

        it('should display SoluM mode', () => {
            render(
                <DashboardAppInfoCard {...defaultProps} workingMode="SOLUM_API" />
            );

            expect(screen.getByText(/SoluM/i)).toBeInTheDocument();
        });

        it('should display space type', () => {
            render(<DashboardAppInfoCard {...defaultProps} />);

            expect(screen.getByText('Office')).toBeInTheDocument();
        });

        it('should display auto-sync enabled with interval', () => {
            render(<DashboardAppInfoCard {...defaultProps} />);

            expect(screen.getByText(/60s/)).toBeInTheDocument();
        });

        it('should display auto-sync disabled', () => {
            render(
                <DashboardAppInfoCard {...defaultProps} autoSyncEnabled={false} />
            );

            expect(screen.getByText(/disabled/i)).toBeInTheDocument();
        });

        it('should render different space type icons', () => {
            const { rerender } = render(
                <DashboardAppInfoCard {...defaultProps} spaceType="office" spaceTypeLabel="Office" />
            );
            expect(screen.getByText('Office')).toBeInTheDocument();

            rerender(
                <DashboardAppInfoCard {...defaultProps} spaceType="room" spaceTypeLabel="Room" />
            );
            expect(screen.getByText('Room')).toBeInTheDocument();

            rerender(
                <DashboardAppInfoCard {...defaultProps} spaceType="chair" spaceTypeLabel="Chair" />
            );
            expect(screen.getByText('Chair')).toBeInTheDocument();

            rerender(
                <DashboardAppInfoCard {...defaultProps} spaceType="person-tag" spaceTypeLabel="Person Tag" />
            );
            expect(screen.getByText('Person Tag')).toBeInTheDocument();
        });
    });

    describe('DashboardSpacesCard', () => {
        const defaultSpacesProps = {
            spaceTypeIcon: 'office',
            spaceTypeLabel: 'Office',
            totalSpaces: 25,
            spacesWithLabels: 20,
            spacesWithoutLabels: 5,
            onAddSpace: vi.fn(),
        };

        it('should render with space type label', () => {
            render(<DashboardSpacesCard {...defaultSpacesProps} />);

            expect(screen.getByText('Office')).toBeInTheDocument();
        });

        it('should display total spaces count', () => {
            render(<DashboardSpacesCard {...defaultSpacesProps} />);

            expect(screen.getByText('25')).toBeInTheDocument();
        });

        it('should display spaces with labels', () => {
            render(<DashboardSpacesCard {...defaultSpacesProps} />);

            expect(screen.getByText('20')).toBeInTheDocument();
        });

        it('should display spaces without labels', () => {
            render(<DashboardSpacesCard {...defaultSpacesProps} />);

            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('should call onAddSpace when add button clicked', () => {
            const mockOnAddSpace = vi.fn();
            render(<DashboardSpacesCard {...defaultSpacesProps} onAddSpace={mockOnAddSpace} />);

            const addButton = screen.getByRole('button', { name: /add/i });
            fireEvent.click(addButton);

            expect(mockOnAddSpace).toHaveBeenCalledTimes(1);
        });

        it('should render different space type icons', () => {
            const { rerender } = render(
                <DashboardSpacesCard {...defaultSpacesProps} spaceTypeIcon="office" />
            );
            expect(screen.getByText('Office')).toBeInTheDocument();

            rerender(
                <DashboardSpacesCard {...defaultSpacesProps} spaceTypeIcon="room" spaceTypeLabel="Room" />
            );
            expect(screen.getByText('Room')).toBeInTheDocument();

            rerender(
                <DashboardSpacesCard {...defaultSpacesProps} spaceTypeIcon="chair" spaceTypeLabel="Chair" />
            );
            expect(screen.getByText('Chair')).toBeInTheDocument();
        });
    });

    describe('DashboardConferenceCard', () => {
        const defaultConferenceProps = {
            totalRooms: 10,
            roomsWithLabels: 8,
            roomsWithoutLabels: 2,
            availableRooms: 6,
            occupiedRooms: 4,
            onAddRoom: vi.fn(),
        };

        it('should render conference title', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            // Conference title from translations
            expect(screen.getByText(/conference/i)).toBeInTheDocument();
        });

        it('should display total rooms count', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            expect(screen.getByText('10')).toBeInTheDocument();
        });

        it('should display rooms with labels', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            expect(screen.getByText('8')).toBeInTheDocument();
        });

        it('should display rooms without labels', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('should display available rooms', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            expect(screen.getByText('6')).toBeInTheDocument();
        });

        it('should display occupied rooms', () => {
            render(<DashboardConferenceCard {...defaultConferenceProps} />);

            expect(screen.getByText('4')).toBeInTheDocument();
        });

        it('should call onAddRoom when add button clicked', () => {
            const mockOnAddRoom = vi.fn();
            render(<DashboardConferenceCard {...defaultConferenceProps} onAddRoom={mockOnAddRoom} />);

            const addButton = screen.getByRole('button', { name: /add/i });
            fireEvent.click(addButton);

            expect(mockOnAddRoom).toHaveBeenCalledTimes(1);
        });
    });

    describe('DashboardPeopleCard', () => {
        const defaultPeopleProps = {
            totalPeople: 100,
            assignedPeople: 75,
            unassignedPeople: 25,
            assignedLabelsCount: 50,
            savedLists: 3,
            activeListName: null,
        };

        it('should render people title', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            // People Manager title specifically
            expect(screen.getByText('People Manager')).toBeInTheDocument();
        });

        it('should display total people count', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            expect(screen.getByText('100')).toBeInTheDocument();
        });

        it('should display assigned people count', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            expect(screen.getByText('75')).toBeInTheDocument();
        });

        it('should display unassigned people count', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            expect(screen.getByText('25')).toBeInTheDocument();
        });

        it('should display assigned labels count', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            expect(screen.getByText('50')).toBeInTheDocument();
        });

        it('should display active list name when set', () => {
            render(
                <DashboardPeopleCard {...defaultPeopleProps} activeListName="Test List" />
            );

            expect(screen.getByText('Test List')).toBeInTheDocument();
        });

        it('should not display list chip when no active list', () => {
            render(<DashboardPeopleCard {...defaultPeopleProps} />);

            // Chip should not be present
            expect(screen.queryByRole('chip')).not.toBeInTheDocument();
        });

        it('should handle zero saved lists', () => {
            render(
                <DashboardPeopleCard {...defaultPeopleProps} savedLists={0} />
            );

            // Should still render without errors
            expect(screen.getByText('100')).toBeInTheDocument();
        });
    });
});
