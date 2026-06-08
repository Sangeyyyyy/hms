import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert Hostel Manager
  const managerPassword = await bcrypt.hash('Manager@123', SALT_ROUNDS);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@dnsc-hostel.com' },
    update: {},
    create: {
      email: 'manager@dnsc-hostel.com',
      password: managerPassword,
      firstName: 'Admin',
      lastName: 'Manager',
      role: Role.HOSTEL_MANAGER,
      isActive: true,
    },
  });

  // Upsert Front Desk Staff
  const frontDeskPassword = await bcrypt.hash('FrontDesk@123', SALT_ROUNDS);
  const frontDesk = await prisma.user.upsert({
    where: { email: 'frontdesk@dnsc-hostel.com' },
    update: {},
    create: {
      email: 'frontdesk@dnsc-hostel.com',
      password: frontDeskPassword,
      firstName: 'Front',
      lastName: 'Desk',
      role: Role.FRONT_DESK,
      isActive: true,
    },
  });

  console.log('✅ Seeded users:');
  console.log(`   📧 ${manager.email} [${manager.role}]`);
  console.log(`   📧 ${frontDesk.email} [${frontDesk.role}]`);

  // Seeding Facility Types
  console.log('🌱 Seeding Facility Types...');
  const facilityTypesData = [
    { name: 'VIP', baseCapacity: 1, maxCapacity: 2, defaultRate: 2500.0 },
    { name: 'Tri-Bedroom', baseCapacity: 3, maxCapacity: 3, defaultRate: 1500.0 },
    { name: 'Dorm', baseCapacity: 4, maxCapacity: 8, defaultRate: 500.0 },
    { name: 'Family', baseCapacity: 4, maxCapacity: 6, defaultRate: 3000.0 },
    { name: 'Function Hall', baseCapacity: 50, maxCapacity: 150, defaultRate: 8000.0 },
  ];

  const facilityTypes: any = {};
  for (const ft of facilityTypesData) {
    facilityTypes[ft.name] = await prisma.facilityType.upsert({
      where: { name: ft.name },
      update: {
        baseCapacity: ft.baseCapacity,
        maxCapacity: ft.maxCapacity,
        defaultRate: ft.defaultRate,
      },
      create: ft,
    });
    console.log(`   🏢 Facility Type: ${ft.name}`);
  }

  // Seeding Facilities
  console.log('🌱 Seeding Facilities...');
  const facilitiesData = [
    { building: 'Building A', facilityCode: 'VIP-101', facilityTypeId: facilityTypes['VIP'].id },
    { building: 'Building A', facilityCode: 'VIP-102', facilityTypeId: facilityTypes['VIP'].id },
    { building: 'Building B', facilityCode: 'TRI-201', facilityTypeId: facilityTypes['Tri-Bedroom'].id },
    { building: 'Building B', facilityCode: 'TRI-202', facilityTypeId: facilityTypes['Tri-Bedroom'].id },
    { building: 'Building C', facilityCode: 'DORM-301', facilityTypeId: facilityTypes['Dorm'].id },
    { building: 'Building C', facilityCode: 'DORM-302', facilityTypeId: facilityTypes['Dorm'].id },
    { building: 'Building A', facilityCode: 'FAM-401', facilityTypeId: facilityTypes['Family'].id },
    { building: 'Building D', facilityCode: 'HALL-100', facilityTypeId: facilityTypes['Function Hall'].id },
  ];

  for (const f of facilitiesData) {
    await prisma.facility.upsert({
      where: { facilityCode: f.facilityCode },
      update: {},
      create: f,
    });
    console.log(`   🚪 Facility: ${f.facilityCode} (${f.building})`);
  }

  // Seeding Inventory Categories & Items
  console.log('🌱 Seeding Inventory Categories & Items...');
  const inventoryData = [
    {
      category: 'Furniture',
      items: ['Bed', 'Chair', 'Table'],
    },
    {
      category: 'Bedding',
      items: ['Mattress', 'Pillow', 'Blanket'],
    },
    {
      category: 'Appliances',
      items: ['Aircon'],
    },
    {
      category: 'Electronics',
      items: ['TV', 'Remote'],
    },
  ];

  const categories: any = {};
  const items: any = {};

  for (const catData of inventoryData) {
    const category = await prisma.inventoryCategory.upsert({
      where: { name: catData.category },
      update: {},
      create: { name: catData.category },
    });
    categories[catData.category] = category;
    console.log(`   📦 Category: ${category.name}`);

    for (const itemName of catData.items) {
      const item = await prisma.inventoryItem.upsert({
        where: { name: itemName },
        update: { categoryId: category.id },
        create: { name: itemName, categoryId: category.id },
      });
      items[itemName] = item;
      console.log(`     🔹 Item: ${item.name}`);
    }
  }

  // Auto-assign default inventory to existing facilities
  console.log('🌱 Assigning default inventory to facilities...');
  const facilities = await prisma.facility.findMany();
  for (const facility of facilities) {
    // Determine default assets based on facility type code or name
    let assetsToAssign: { name: string; quantity: number }[] = [];
    if (facility.facilityCode.startsWith('VIP')) {
      assetsToAssign = [
        { name: 'Bed', quantity: 1 },
        { name: 'Mattress', quantity: 1 },
        { name: 'Pillow', quantity: 2 },
        { name: 'Blanket', quantity: 2 },
        { name: 'Aircon', quantity: 1 },
        { name: 'TV', quantity: 1 },
        { name: 'Remote', quantity: 1 },
        { name: 'Chair', quantity: 2 },
        { name: 'Table', quantity: 1 },
      ];
    } else if (facility.facilityCode.startsWith('TRI')) {
      assetsToAssign = [
        { name: 'Bed', quantity: 3 },
        { name: 'Mattress', quantity: 3 },
        { name: 'Pillow', quantity: 3 },
        { name: 'Blanket', quantity: 3 },
        { name: 'Aircon', quantity: 1 },
        { name: 'Chair', quantity: 3 },
        { name: 'Table', quantity: 1 },
      ];
    } else if (facility.facilityCode.startsWith('DORM')) {
      assetsToAssign = [
        { name: 'Bed', quantity: 8 },
        { name: 'Mattress', quantity: 8 },
        { name: 'Pillow', quantity: 8 },
        { name: 'Blanket', quantity: 8 },
        { name: 'Aircon', quantity: 2 },
        { name: 'Chair', quantity: 8 },
        { name: 'Table', quantity: 2 },
      ];
    } else if (facility.facilityCode.startsWith('FAM')) {
      assetsToAssign = [
        { name: 'Bed', quantity: 4 },
        { name: 'Mattress', quantity: 4 },
        { name: 'Pillow', quantity: 6 },
        { name: 'Blanket', quantity: 6 },
        { name: 'Aircon', quantity: 2 },
        { name: 'TV', quantity: 1 },
        { name: 'Remote', quantity: 1 },
        { name: 'Chair', quantity: 6 },
        { name: 'Table', quantity: 2 },
      ];
    } else if (facility.facilityCode.startsWith('HALL')) {
      assetsToAssign = [
        { name: 'Chair', quantity: 100 },
        { name: 'Table', quantity: 10 },
        { name: 'Aircon', quantity: 4 },
      ];
    }

    for (const asset of assetsToAssign) {
      const item = items[asset.name];
      if (item) {
        await prisma.facilityInventory.upsert({
          where: {
            facilityId_itemId: {
              facilityId: facility.id,
              itemId: item.id,
            },
          },
          update: { quantity: asset.quantity },
          create: {
            facilityId: facility.id,
            itemId: item.id,
            quantity: asset.quantity,
            condition: 'GOOD',
            status: 'ACTIVE',
          },
        });
      }
    }
    console.log(`     ✅ Inventory assigned to ${facility.facilityCode}`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
