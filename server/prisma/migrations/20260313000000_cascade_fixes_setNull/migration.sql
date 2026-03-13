-- AlterTable: PeopleListMembership.space → onDelete: SetNull (was Restrict)
ALTER TABLE "people_list_memberships" DROP CONSTRAINT IF EXISTS "people_list_memberships_space_id_fkey";
ALTER TABLE "people_list_memberships" ADD CONSTRAINT "people_list_memberships_space_id_fkey"
    FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: PeopleList.createdBy → onDelete: SetNull (was Restrict)
ALTER TABLE "people_lists" DROP CONSTRAINT IF EXISTS "people_lists_created_by_fkey";
ALTER TABLE "people_lists" ADD CONSTRAINT "people_lists_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: SpacesList.createdBy → onDelete: SetNull (was Restrict)
ALTER TABLE "spaces_lists" DROP CONSTRAINT IF EXISTS "spaces_lists_created_by_fkey";
ALTER TABLE "spaces_lists" ADD CONSTRAINT "spaces_lists_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
