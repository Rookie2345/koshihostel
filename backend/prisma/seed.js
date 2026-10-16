require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Koshi Hostel Database Seed ---');

  const { ADMIN_SETUP_KEY, ADMIN_INITIAL_PASSWORD } = process.env;

  if (!ADMIN_SETUP_KEY) {
    console.error('ERROR: ADMIN_SETUP_KEY environment variable is not defined.');
    console.error('Instructions:');
    console.error('1. Set ADMIN_SETUP_KEY in your .env file or environment.');
    console.error('2. Ensure it matches your configured secret to authorize database seeding.');
    process.exit(1);
  }

  if (!ADMIN_INITIAL_PASSWORD) {
    console.error('ERROR: ADMIN_INITIAL_PASSWORD environment variable is not defined.');
    console.error('Instructions:');
    console.error('1. Provide an initial password via the ADMIN_INITIAL_PASSWORD environment variable.');
    console.error('2. Example: ADMIN_INITIAL_PASSWORD="SecureHostelPassword123!"');
    process.exit(1);
  }

  const configuredKey = process.env.ADMIN_SETUP_KEY;
  if (configuredKey !== ADMIN_SETUP_KEY) {
    console.error('ERROR: Provided ADMIN_SETUP_KEY does not match the configured secret.');
    process.exit(1);
  }

  // 1. Seed or Upsert Admin User
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const passwordHash = await bcrypt.hash(ADMIN_INITIAL_PASSWORD, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { username: 'amoon67' },
    update: {
      passwordHash,
      role: 'ADMIN',
      loginEnabled: true
    },
    create: {
      username: 'amoon67',
      passwordHash,
      role: 'ADMIN',
      loginEnabled: true
    }
  });

  console.log(`Admin user "amoon67" provisioned (ID: ${adminUser.id}).`);

  // 2. Seed Default Fee Groups
  const defaultFeeGroups = [
    {
      name: 'NPR 9,000 Group',
      monthlyAmount: 9000.0,
      description: 'Standard 4-bed shared room with regular meal plan',
      isActive: true
    },
    {
      name: 'NPR 10,000 Group',
      monthlyAmount: 10000.0,
      description: 'Standard 3-bed shared room with regular meal plan',
      isActive: true
    },
    {
      name: 'NPR 11,000 Group',
      monthlyAmount: 11000.0,
      description: 'Premium 2-bed shared room with regular meal plan & amenities',
      isActive: true
    }
  ];

  for (const group of defaultFeeGroups) {
    const feeGroup = await prisma.feeGroup.upsert({
      where: { name: group.name },
      update: {
        monthlyAmount: group.monthlyAmount,
        description: group.description,
        isActive: group.isActive
      },
      create: {
        name: group.name,
        monthlyAmount: group.monthlyAmount,
        description: group.description,
        isActive: group.isActive
      }
    });
    console.log(`Fee group "${feeGroup.name}" provisioned (Amount: NPR ${feeGroup.monthlyAmount}).`);
  }

  console.log('--- Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
