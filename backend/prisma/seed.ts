/**
 * Development seed data: 3 demo cafes with 3-5 drinks each, plus one ADMIN
 * and one BARISTA dev account so the Admin Dashboard and scan page have
 * something real to log in with.
 *
 * Safe to run more than once - matches by name and skips anything that
 * already exists, so re-running never creates duplicates.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

interface SeedDrink {
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface SeedCafe {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  image_url: string;
  description: string;
  drinks: SeedDrink[];
}

const CAFES: SeedCafe[] = [
  {
    name: 'North Dallas Coffee',
    address: '4001 Preston Rd',
    city: 'Dallas',
    state: 'TX',
    latitude: 32.9126,
    longitude: -96.8006,
    image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
    description: 'A cozy neighborhood roaster known for single-origin pour overs.',
    drinks: [
      { name: 'Espresso', description: 'Double shot, house blend.', price: 3.5, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Espresso with steamed milk and foam.', price: 4.75, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk.', price: 5.0, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cold Brew', description: '18-hour slow-steeped cold brew.', price: 5.25, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    name: 'Oak & Bean Coffee',
    address: '215 S Oak Cliff Blvd',
    city: 'Dallas',
    state: 'TX',
    latitude: 32.7481,
    longitude: -96.8245,
    image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
    description: 'Independent specialty coffee shop with in-house roasted beans.',
    drinks: [
      { name: 'Espresso', description: 'Single-origin espresso shot.', price: 3.25, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Mocha', description: 'Espresso, steamed milk, dark chocolate.', price: 5.5, image_url: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk.', price: 4.9, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Classic Italian-style cappuccino.', price: 4.6, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cold Brew', description: 'Smooth, low-acid cold brew.', price: 5.0, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    name: 'Downtown Brew Lab',
    address: '1500 Main St',
    city: 'Dallas',
    state: 'TX',
    latitude: 32.7801,
    longitude: -96.8003,
    image_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800',
    description: 'Downtown coffee bar experimenting with brew methods and roasts.',
    drinks: [
      { name: 'Espresso', description: 'Bright, fruit-forward espresso.', price: 3.75, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Double espresso with microfoam.', price: 5.0, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk, latte art.', price: 5.25, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
    ],
  },
];

async function seedCafe(cafe: SeedCafe): Promise<string> {
  const existing = await prisma.cafe.findFirst({ where: { name: cafe.name }, select: { id: true } });
  if (existing) {
    logger.info(`Cafe already exists, skipping: ${cafe.name}`);
    return existing.id;
  }

  const created = await prisma.cafe.create({
    data: {
      name: cafe.name,
      address: cafe.address,
      city: cafe.city,
      state: cafe.state,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      image_url: cafe.image_url,
      description: cafe.description,
    },
    select: { id: true },
  });
  logger.info(`Created cafe: ${cafe.name}`);
  return created.id;
}

async function seedDrink(cafeId: string, drink: SeedDrink): Promise<void> {
  const existing = await prisma.drink.findFirst({ where: { cafe_id: cafeId, name: drink.name } });
  if (existing) {
    return; // already seeded for this cafe
  }

  await prisma.drink.create({
    data: { cafe_id: cafeId, name: drink.name, description: drink.description, price: drink.price, image_url: drink.image_url },
  });
  logger.info(`  + Drink: ${drink.name}`);
}

async function seedAdminUser(): Promise<void> {
  const email = 'admin@socialcup.dev';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info('Dev admin account already exists, skipping.');
    return;
  }

  const passwordHash = await hashPassword('AdminDev123');
  await prisma.user.create({
    data: { name: 'Social Cup Admin', email, password_hash: passwordHash, role: 'ADMIN' },
  });
  logger.info(`Created dev admin account: ${email} (password: AdminDev123) - LOCAL DEV ONLY.`);
}

async function seedBaristaUser(): Promise<void> {
  const email = 'barista@socialcup.dev';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info('Dev barista account already exists, skipping.');
    return;
  }

  const passwordHash = await hashPassword('BaristaDev123');
  await prisma.user.create({
    data: { name: 'Social Cup Barista', email, password_hash: passwordHash, role: 'BARISTA' },
  });
  logger.info(`Created dev barista account: ${email} (password: BaristaDev123) - LOCAL DEV ONLY.`);
}

async function seed(): Promise<void> {
  for (const cafe of CAFES) {
    const cafeId = await seedCafe(cafe);
    for (const drink of cafe.drinks) {
      await seedDrink(cafeId, drink);
    }
  }
  await seedAdminUser();
  await seedBaristaUser();
}

seed()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    logger.error('Seed run failed', err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
