import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default organization
    const org = await prisma.organization.upsert({
        where: { code: 'ELECTIS' },
        update: {},
        create: {
            name: 'Electis Default Organization',
            code: 'ELECTIS',
            settings: {
                spaceType: 'room',
                autoSyncEnabled: true,
                autoSyncInterval: 300,
            },
        },
    });

    console.log(`✅ Organization created: ${org.name}`);

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@electis.co.il';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            passwordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: Role.ADMIN,
            organizationId: org.id,
        },
    });

    console.log(`✅ Admin user created: ${admin.email}`);

    // Create sample spaces
    const spaces = [
        { externalId: 'ROOM-101', data: { roomName: 'Meeting Room A', floor: '1', capacity: '10' } },
        { externalId: 'ROOM-102', data: { roomName: 'Meeting Room B', floor: '1', capacity: '8' } },
        { externalId: 'DESK-201', data: { roomName: 'Desk 201', floor: '2', department: 'Engineering' } },
        { externalId: 'DESK-202', data: { roomName: 'Desk 202', floor: '2', department: 'Engineering' } },
        { externalId: 'DESK-203', data: { roomName: 'Desk 203', floor: '2', department: 'Design' } },
    ];

    for (const space of spaces) {
        await prisma.space.upsert({
            where: {
                organizationId_externalId: {
                    organizationId: org.id,
                    externalId: space.externalId,
                },
            },
            update: {},
            create: {
                ...space,
                organizationId: org.id,
                createdById: admin.id,
                updatedById: admin.id,
                syncStatus: 'SYNCED',
            },
        });
    }

    console.log(`✅ ${spaces.length} sample spaces created`);

    // Create sample conference rooms
    const conferenceRooms = [
        { externalId: 'C01', roomName: 'Board Room' },
        { externalId: 'C02', roomName: 'Conference Room Alpha' },
        { externalId: 'C03', roomName: 'Conference Room Beta' },
    ];

    for (const room of conferenceRooms) {
        await prisma.conferenceRoom.upsert({
            where: {
                organizationId_externalId: {
                    organizationId: org.id,
                    externalId: room.externalId,
                },
            },
            update: {},
            create: {
                ...room,
                organizationId: org.id,
                syncStatus: 'SYNCED',
            },
        });
    }

    console.log(`✅ ${conferenceRooms.length} sample conference rooms created`);

    // Create sample people
    const people = [
        { externalId: 'EMP-001', virtualSpaceId: 'POOL-0001', data: { name: 'John Doe', department: 'Engineering', title: 'Developer' } },
        { externalId: 'EMP-002', virtualSpaceId: 'POOL-0002', data: { name: 'Jane Smith', department: 'Design', title: 'Designer' } },
        { externalId: 'EMP-003', virtualSpaceId: 'POOL-0003', data: { name: 'Bob Wilson', department: 'Engineering', title: 'Tech Lead' } },
    ];

    for (const person of people) {
        await prisma.person.upsert({
            where: { id: person.externalId }, // Using externalId as temp lookup
            update: {},
            create: {
                ...person,
                organizationId: org.id,
                syncStatus: 'SYNCED',
            },
        });
    }

    console.log(`✅ ${people.length} sample people created`);

    console.log('');
    console.log('🎉 Database seeding completed!');
    console.log('');
    console.log('📧 Admin Login:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
