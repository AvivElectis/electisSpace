/**
 * Compass Booking Background Jobs
 *
 * Two interval-based jobs:
 * 1. Auto-Release: Every 60s — releases expired bookings (BOOKED/CHECKED_IN past endTime)
 * 2. No-Show Detection: Every 5min — marks BOOKED bookings as NO_SHOW when check-in window expires
 */
import { processAutoRelease, processNoShows } from '../../../features/compass-bookings/index.js';
import { appLogger } from '../services/appLogger.js';

const AUTO_RELEASE_INTERVAL_MS = 60 * 1000;       // 1 minute
const NO_SHOW_INTERVAL_MS = 5 * 60 * 1000;        // 5 minutes
const INITIAL_DELAY_MS = 30_000;                   // 30s after boot

let autoReleaseTimer: ReturnType<typeof setInterval> | null = null;
let noShowTimer: ReturnType<typeof setInterval> | null = null;

export const startCompassBookingJobs = () => {
    // Auto-release job
    setTimeout(() => {
        autoReleaseTimer = setInterval(async () => {
            try {
                await processAutoRelease();
            } catch (error) {
                appLogger.error('CompassJobs', 'Auto-release job failed', { error });
            }
        }, AUTO_RELEASE_INTERVAL_MS);
        appLogger.info('CompassJobs', 'Auto-release job started (60s interval)');
    }, INITIAL_DELAY_MS);

    // No-show detection job
    setTimeout(() => {
        noShowTimer = setInterval(async () => {
            try {
                await processNoShows();
            } catch (error) {
                appLogger.error('CompassJobs', 'No-show detection job failed', { error });
            }
        }, NO_SHOW_INTERVAL_MS);
        appLogger.info('CompassJobs', 'No-show detection job started (5min interval)');
    }, INITIAL_DELAY_MS + 10_000); // stagger by 10s
};

export const stopCompassBookingJobs = () => {
    if (autoReleaseTimer) {
        clearInterval(autoReleaseTimer);
        autoReleaseTimer = null;
    }
    if (noShowTimer) {
        clearInterval(noShowTimer);
        noShowTimer = null;
    }
    appLogger.info('CompassJobs', 'Booking jobs stopped');
};
