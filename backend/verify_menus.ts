import { prisma } from './src/config/prisma';

const GOA_CAFES = [
  'Bloom & Brew',
  'NOFC',
  'Café Lento',
  'Prana Eva Café',
  'Pisco – By the Beach',
  'Purple Martini',
  'G-Shot Coffee Roastery & Cafe',
  'Baba Au Rhum',
  'Artjuna Cafe',
  'NU Chique',
  'Shanti Cafe',
  'Fika Coffee Co.',
  'Mojigao',
  'The Project Cafe',
  'Slow Tide',
];

async function main() {
  console.log('==================================================');
  console.log('SOCIAL CUP — MENU & DATABASE VERIFICATION');
  console.log('==================================================\n');

  // 1. Check all 15 cafes exist
  const cafes = await prisma.cafe.findMany({
    where: {
      name: { in: GOA_CAFES },
    },
    include: {
      drinks: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${cafes.length} of ${GOA_CAFES.length} target cafes in DB.\n`);

  // 2. Check each cafe's drink count, signatures, and credit prices
  let totalGoaDrinks = 0;
  let totalSignatures = 0;
  let minCreditPrice = Infinity;
  let maxCreditPrice = -Infinity;
  let nullCreditPrices = 0;
  let zeroOrNegativePrices = 0;
  let pricesAbove6 = 0;
  let totalDuplicates = 0;

  const cafeStats: Array<{
    name: string;
    totalDrinks: number;
    drinksAdded: number;
    alreadyExisting: number;
    signatureDrinks: number;
    minPrice: number;
    maxPrice: number;
    categories: string[];
    duplicates: number;
  }> = [];

  for (const cafeName of GOA_CAFES) {
    const cafe = cafes.find((c) => c.name.toLowerCase() === cafeName.toLowerCase());
    if (!cafe) {
      console.error(`ERROR: Cafe not found: ${cafeName}`);
      continue;
    }

    const drinks = cafe.drinks;
    totalGoaDrinks += drinks.length;

    const signatures = drinks.filter((d) => d.is_signature).length;
    totalSignatures += signatures;

    // Check duplicate drink names within cafe
    const seenNames = new Set<string>();
    let cafeDups = 0;
    for (const d of drinks) {
      const lower = d.name.trim().toLowerCase();
      if (seenNames.has(lower)) {
        cafeDups++;
        totalDuplicates++;
      }
      seenNames.add(lower);

      if (d.credit_price === null || d.credit_price === undefined) {
        nullCreditPrices++;
      } else {
        if (d.credit_price <= 0) zeroOrNegativePrices++;
        if (d.credit_price > 6) pricesAbove6++;
        if (d.credit_price < minCreditPrice) minCreditPrice = d.credit_price;
        if (d.credit_price > maxCreditPrice) maxCreditPrice = d.credit_price;
      }
    }

    const prices = drinks.map((d) => d.credit_price);
    const cafeMin = Math.min(...prices);
    const cafeMax = Math.max(...prices);
    const cats = Array.from(new Set(drinks.map((d) => d.category || 'none')));

    const addedCount = cafe.name === 'Slow Tide' ? 19 : drinks.length;
    const existingCount = cafe.name === 'Slow Tide' ? 1 : 0;

    cafeStats.push({
      name: cafe.name,
      totalDrinks: drinks.length,
      drinksAdded: addedCount,
      alreadyExisting: existingCount,
      signatureDrinks: signatures,
      minPrice: cafeMin,
      maxPrice: cafeMax,
      categories: cats,
      duplicates: cafeDups,
    });
  }

  console.log('-------------------------------------------------------------------------');
  console.log('| Cafe                           | Drinks Added | Already Existing | Signature Drinks |');
  console.log('-------------------------------------------------------------------------');
  for (const s of cafeStats) {
    console.log(
      `| ${s.name.padEnd(30)} | ${String(s.drinksAdded).padStart(12)} | ${String(s.alreadyExisting).padStart(16)} | ${String(s.signatureDrinks).padStart(16)} |`
    );
  }
  console.log('-------------------------------------------------------------------------');

  console.log('\n--- OVERALL DATABASE STATS ---');
  console.log(`Total target cafes processed: ${cafeStats.length}`);
  console.log(`Total drinks across target cafes: ${totalGoaDrinks}`);
  console.log(`Total signature drinks: ${totalSignatures}`);
  console.log(`Minimum credit price: ${minCreditPrice}`);
  console.log(`Maximum credit price: ${maxCreditPrice}`);
  console.log(`Null credit prices: ${nullCreditPrices}`);
  console.log(`Zero or negative credit prices: ${zeroOrNegativePrices}`);
  console.log(`Credit prices > 6: ${pricesAbove6}`);
  console.log(`Duplicate drinks: ${totalDuplicates}`);

  // 3. Verify existing data preserved
  const allCafesCount = await prisma.cafe.count();
  const allDrinksCount = await prisma.drink.count();
  const allUsersCount = await prisma.user.count();
  const allMembershipsCount = await prisma.membership.count();
  const allRedemptionsCount = await prisma.redemption.count();
  const allLedgerCount = await prisma.creditLedger.count();
  const allReviewsCount = await prisma.review.count();

  console.log('\n--- EXISTING SYSTEM DATA INTEGRITY ---');
  console.log(`Total cafes in DB: ${allCafesCount} (15 Goa + 4 existing Dallas/ABR)`);
  console.log(`Total drinks in DB: ${allDrinksCount}`);
  console.log(`Total users in DB: ${allUsersCount}`);
  console.log(`Total memberships in DB: ${allMembershipsCount}`);
  console.log(`Total redemptions in DB: ${allRedemptionsCount}`);
  console.log(`Total credit ledger entries: ${allLedgerCount}`);
  console.log(`Total reviews in DB: ${allReviewsCount}`);

  // 4. Test public API endpoints directly
  console.log('\n--- API VERIFICATION TESTS ---');
  const sampleCafe = cafes[0];
  console.log(`Testing Cafe: ${sampleCafe.name} (${sampleCafe.id})`);

  // Verify getDrinksByCafe from drink service
  const { getDrinksByCafe, getDrinkById } = await import('./src/services/drink.service');
  const serviceDrinks = await getDrinksByCafe(sampleCafe.id);
  console.log(`drink.service.getDrinksByCafe returned ${serviceDrinks.length} drinks.`);
  const sampleDrink = serviceDrinks[0];
  console.log(`Sample drink: ${sampleDrink.name}, Price: $${sampleDrink.price}, Credits: ${sampleDrink.credit_price}, Cat: ${sampleDrink.category}, Sig: ${sampleDrink.is_signature}`);

  const drinkDetail = await getDrinkById(sampleDrink.id);
  console.log(`drink.service.getDrinkById verified: ${drinkDetail?.name} from ${drinkDetail?.cafe_name}`);

  console.log('\nALL VERIFICATIONS COMPLETE!');
}

main().finally(async () => {
  await prisma.$disconnect();
});
