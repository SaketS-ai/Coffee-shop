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
import { CAFE_MENUS, SeedMenuDrink } from './cafeMenus';

const prisma = new PrismaClient();

interface SeedDrink {
  name: string;
  description: string;
  price: number;
  image_url: string;
  credit_price?: number;
  category?: 'espresso' | 'cold_brew' | 'latte' | 'specialty' | null;
  is_signature?: boolean;
}

interface SeedCafe {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  description?: string | null;
  neighborhood?: string | null;
  drinks?: SeedDrink[];
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
      { name: 'Espresso', description: 'Double shot, house blend.', price: 3.5, credit_price: 2, category: 'espresso', is_signature: false, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Espresso with steamed milk and foam.', price: 4.75, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk.', price: 5.0, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cold Brew', description: '18-hour slow-steeped cold brew.', price: 5.25, credit_price: 3, category: 'cold_brew', is_signature: false, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400' },
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
      { name: 'Espresso', description: 'Single-origin espresso shot.', price: 3.25, credit_price: 2, category: 'espresso', is_signature: false, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Mocha', description: 'Espresso, steamed milk, dark chocolate.', price: 5.5, credit_price: 4, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk.', price: 4.9, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Classic Italian-style cappuccino.', price: 4.6, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cold Brew', description: 'Smooth, low-acid cold brew.', price: 5.0, credit_price: 3, category: 'cold_brew', is_signature: false, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400' },
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
      { name: 'Espresso', description: 'Bright, fruit-forward espresso.', price: 3.75, credit_price: 2, category: 'espresso', is_signature: false, image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cappuccino', description: 'Double espresso with microfoam.', price: 5.0, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=400' },
      { name: 'Latte', description: 'Espresso with steamed milk, latte art.', price: 5.25, credit_price: 3, category: 'latte', is_signature: false, image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
    ],
  },
  {
    name: 'Bloom & Brew',
    address: 'Anjuna Beach Road, Monteiro Vaddo',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'NOFC',
    address: 'Morjim-Ashwem Road',
    city: 'Morjim',
    state: 'Goa',
    neighborhood: 'Morjim',
    image_url: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Café Lento',
    address: 'Near 31st January Road, Fontainhas',
    city: 'Panaji',
    state: 'Goa',
    neighborhood: 'Panaji',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Prana Eva Café',
    address: 'Ashwem Beach Road',
    city: 'Mandrem',
    state: 'Goa',
    neighborhood: 'Mandrem',
    image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Pisco – By the Beach',
    address: 'Anjuna Beach, Monteiro Vaddo',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Purple Martini',
    address: 'St. Anthony Praise, Sun Sunset Point',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'G-Shot Coffee Roastery & Cafe',
    address: 'House 446, Socol Vaddo',
    city: 'Assagao',
    state: 'Goa',
    neighborhood: 'Assagao',
    image_url: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Baba Au Rhum',
    address: 'House 1054, Sim Vaddo',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Artjuna Cafe',
    address: '972, Market Road, Monteiro Vaddo',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'NU Chique',
    address: 'Mandrem Beach Road',
    city: 'Mandrem',
    state: 'Goa',
    neighborhood: 'Mandrem',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Shanti Cafe',
    address: 'Junas Vaddo',
    city: 'Mandrem',
    state: 'Goa',
    neighborhood: 'Mandrem',
    image_url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Fika Coffee Co.',
    address: 'House 584, Deul Vaddo',
    city: 'Vagator',
    state: 'Goa',
    neighborhood: 'Vagator',
    image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Mojigao',
    address: 'Near Swan Yoga, Off Mapusa-Anjuna Road',
    city: 'Assagao',
    state: 'Goa',
    neighborhood: 'Assagao',
    image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'The Project Cafe',
    address: 'Amalia, House 198, Mazzal Vaddo',
    city: 'Assagao',
    state: 'Goa',
    neighborhood: 'Assagao',
    image_url: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Slow Tide',
    address: 'Dmello Vaddo, Anjuna Beach',
    city: 'Anjuna',
    state: 'Goa',
    neighborhood: 'Anjuna',
    image_url: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&q=80&w=800',
  },
];

async function seedCafe(cafe: SeedCafe): Promise<string> {
  const pinHash = await hashPassword('1234');
  const existing = await prisma.cafe.findFirst({
    where: {
      name: {
        equals: cafe.name.trim(),
        mode: 'insensitive',
      },
    },
    select: { id: true, name: true, scan_pin_hash: true },
  });
  if (existing) {
    if (!existing.scan_pin_hash) {
      await prisma.cafe.update({ where: { id: existing.id }, data: { scan_pin_hash: pinHash } });
    }
    logger.info(`Cafe already exists, skipping: ${existing.name}`);
    return existing.id;
  }

  const created = await prisma.cafe.create({
    data: {
      name: cafe.name,
      address: cafe.address,
      city: cafe.city,
      state: cafe.state,
      latitude: cafe.latitude ?? null,
      longitude: cafe.longitude ?? null,
      image_url: cafe.image_url ?? null,
      description: cafe.description ?? null,
      neighborhood: cafe.neighborhood ?? null,
      scan_pin_hash: pinHash,
    },
    select: { id: true },
  });
  logger.info(`Created cafe: ${cafe.name} (PIN: 1234)`);
  return created.id;
}

async function seedDrink(cafeId: string, drink: SeedDrink | SeedMenuDrink): Promise<boolean> {
  const existing = await prisma.drink.findFirst({
    where: {
      cafe_id: cafeId,
      name: {
        equals: drink.name.trim(),
        mode: 'insensitive',
      },
    },
  });
  if (existing) {
    return false; // already seeded for this cafe
  }

  // Validate credit_price: must be integer between 1 and 6
  const creditPrice = drink.credit_price;
  if (
    creditPrice === undefined ||
    creditPrice === null ||
    creditPrice < 1 ||
    creditPrice > 6 ||
    !Number.isInteger(creditPrice)
  ) {
    throw new Error(
      `Invalid credit_price for drink "${drink.name}": ${creditPrice}. Must be an integer between 1 and 6.`
    );
  }

  await prisma.drink.create({
    data: {
      cafe_id: cafeId,
      name: drink.name.trim(),
      description: drink.description,
      price: drink.price,
      credit_price: creditPrice,
      category: drink.category ?? null,
      is_signature: drink.is_signature === true,
      image_url: drink.image_url,
    },
  });
  logger.info(`  + Drink: ${drink.name} (${creditPrice} credits, ${drink.category || 'uncategorized'}${drink.is_signature ? ', signature' : ''})`);
  return true;
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
  let createdDrinks = 0;
  let skippedDrinks = 0;

  for (const cafe of CAFES) {
    const cafeId = await seedCafe(cafe);
    const drinks = cafe.drinks ?? CAFE_MENUS[cafe.name];
    if (drinks && drinks.length > 0) {
      for (const drink of drinks) {
        const created = await seedDrink(cafeId, drink);
        if (created) {
          createdDrinks++;
        } else {
          skippedDrinks++;
        }
      }
    }
  }
  logger.info(`Seed complete: ${createdDrinks} drinks created, ${skippedDrinks} already existed.`);
  await seedAdminUser();
  await seedBaristaUser();
}

seed()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    logger.error('Seed run failed', err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
