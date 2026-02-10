-- Clean database keeping only aviv@electis.co.il user
-- Execute in order to handle foreign key constraints

BEGIN;

-- Get the user ID to preserve
DO $$
DECLARE
    keep_user_id TEXT;
BEGIN
    SELECT id INTO keep_user_id FROM users WHERE email = 'aviv@electis.co.il';
    RAISE NOTICE 'Preserving user ID: %', keep_user_id;

    -- Delete verification codes for other users
    DELETE FROM verification_codes WHERE user_id != keep_user_id;
    RAISE NOTICE 'Deleted verification_codes for other users';

    -- Delete refresh tokens for other users
    DELETE FROM refresh_tokens WHERE user_id != keep_user_id;
    RAISE NOTICE 'Deleted refresh_tokens for other users';

    -- Delete user-store associations for other users
    DELETE FROM user_stores WHERE user_id != keep_user_id;
    RAISE NOTICE 'Deleted user_stores for other users';

    -- Delete user-company associations for other users
    DELETE FROM user_companies WHERE user_id != keep_user_id;
    RAISE NOTICE 'Deleted user_companies for other users';

    -- Delete all users except aviv@electis.co.il
    DELETE FROM users WHERE id != keep_user_id;
    RAISE NOTICE 'Deleted all users except aviv@electis.co.il';

    -- Delete people list memberships (junction table)
    DELETE FROM people_list_memberships;
    RAISE NOTICE 'Deleted people_list_memberships';

    -- Delete people lists
    DELETE FROM people_lists;
    RAISE NOTICE 'Deleted people_lists';

    -- Delete all people
    DELETE FROM people;
    RAISE NOTICE 'Deleted people';

    -- Delete spaces lists
    DELETE FROM spaces_lists;
    RAISE NOTICE 'Deleted spaces_lists';

    -- Delete all spaces
    DELETE FROM spaces;
    RAISE NOTICE 'Deleted spaces';

    -- Delete all conference rooms
    DELETE FROM conference_rooms;
    RAISE NOTICE 'Deleted conference_rooms';

    -- Delete all stores
    DELETE FROM stores;
    RAISE NOTICE 'Deleted stores';

    -- Delete all companies
    DELETE FROM companies;
    RAISE NOTICE 'Deleted companies';

    -- Delete sync queue
    DELETE FROM sync_queue;
    RAISE NOTICE 'Deleted sync_queue';

    -- Delete audit logs
    DELETE FROM audit_logs;
    RAISE NOTICE 'Deleted audit_logs';

    -- Delete any remaining user associations for the kept user
    DELETE FROM user_stores WHERE user_id = keep_user_id;
    DELETE FROM user_companies WHERE user_id = keep_user_id;
    RAISE NOTICE 'Cleaned up associations for aviv@electis.co.il';

    RAISE NOTICE 'Database cleanup completed successfully - only aviv@electis.co.il remains';
END $$;

COMMIT;
