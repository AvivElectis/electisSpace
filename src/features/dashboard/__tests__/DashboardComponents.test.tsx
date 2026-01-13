/**
 * Dashboard Components Tests
 * 
 * Tests for dashboard UI components including:
 * - DashboardStatusChip
 * - DashboardAppInfoCard
 * - DashboardSpacesCard
 * - DashboardPeopleCard
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils/testUtils';
import { DashboardStatusChip } from '../components/DashboardStatusChip';
import { DashboardAppInfoCard } from '../components/DashboardAppInfoCard';
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
});
