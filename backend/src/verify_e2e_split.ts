import { prisma } from './config/prisma';
import { loginCafeStaff, loginUser, registerUser } from './services/auth.service';
import { createRedemption, redeemCode } from './services/redemption.service';
import { getTodayRedemptions } from './services/scanner.service';
import { verifyAuthToken } from './utils/jwt';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('============================================================');
  console.log('SOCIAL CUP — APPLICATION SPLIT END-TO-END VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ------------------------------------------------------------
  // SECTION 1: FRONTEND CODE & ROLE ISOLATION AUDIT
  // ------------------------------------------------------------
  console.log('\n--- 1. FRONTEND SEPARATION AUDIT ---');
  const rootDir = path.resolve(__dirname, '../../');
  const memberAppSrc = path.join(rootDir, 'apps/member/src');
  const operationsAppSrc = path.join(rootDir, 'apps/operations/src');

  function readAllFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(readAllFiles(fullPath));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html')) {
        results.push(fs.readFileSync(fullPath, 'utf-8'));
      }
    }
    return results;
  }

  const memberContents = readAllFiles(memberAppSrc).join('\n');
  const operationsContents = readAllFiles(operationsAppSrc).join('\n');

  assert(!memberContents.includes('Admin Profile'), 'Member App does NOT contain "Admin Profile"');
  assert(!memberContents.includes('Cafe User'), 'Member App does NOT contain "Cafe User"');
  assert(!memberContents.includes('/admin/cafes'), 'Member App does NOT contain Admin routing');

  assert(!operationsContents.includes('Member Profile'), 'Operations App does NOT contain "Member Profile"');
  assert(operationsContents.includes('Admin Profile'), 'Operations App contains "Admin Profile"');
  assert(operationsContents.includes('Cafe User'), 'Operations App contains "Cafe User"');

  // Verify PINs are not hardcoded in frontend
  assert(!memberContents.includes('pinHash') && !operationsContents.includes('pinHash'), 'No PIN hashes in frontend code');
  assert(!memberContents.includes('scan_pin_hash') && !operationsContents.includes('scan_pin_hash'), 'No scan_pin_hash in frontend code');

  // ------------------------------------------------------------
  // SECTION 2: MEMBER APPLICATION BACKEND INTEGRATION
  // ------------------------------------------------------------
  console.log('\n--- 2. MEMBER EXPERIENCE TESTS ---');

  // 2.1 Discover cafes from PostgreSQL
  const cafes = await prisma.cafe.findMany({ where: { is_active: true } });
  assert(cafes.length >= 3, `Discovered ${cafes.length} partner cafes from PostgreSQL database`);
  
  // Verify Bloom & Brew and NOFC exist in DB
  const bloom = cafes.find(c => c.name.toLowerCase().includes('bloom'));
  const nofc = cafes.find(c => c.name.toLowerCase().includes('nofc'));
  assert(Boolean(bloom), 'PostgreSQL contains Bloom & Brew cafe');
  assert(Boolean(nofc), 'PostgreSQL contains NOFC cafe');

  // 2.2 Member Signup
  const memberEmail = `e2e-member-${randomUUID().slice(0, 8)}@example.test`;
  const { user: newMember, token: memberToken } = await registerUser({
    name: 'E2E Test Member',
    email: memberEmail,
    password: 'Password123!',
  });
  assert(newMember.role === 'MEMBER', `Member registered successfully with role MEMBER (${newMember.email})`);

  // 2.3 Member Login
  const { user: loggedMember, token: loggedMemberToken } = await loginUser({
    email: memberEmail,
    password: 'Password123!',
  });
  assert(loggedMember.id === newMember.id, 'Member login succeeded with email/password');

  // 2.4 Member Membership & Credits
  const membership = await prisma.membership.create({
    data: {
      user_id: newMember.id,
      status: 'ACTIVE',
      credits: 30,
      current_cycle_start: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  assert(membership.credits === 30, 'Member has 30 drink credits');

  // 2.5 Cafe drinks & Menu
  const testCafe = bloom || cafes[0];
  const drinks = await prisma.drink.findMany({ where: { cafe_id: testCafe.id } });
  assert(drinks.length > 0, `Cafe "${testCafe.name}" has ${drinks.length} drinks on menu`);

  // 2.6 Generate Redemption QR
  const testDrink = drinks[0];
  const redemption = await createRedemption({
    userId: newMember.id,
    cafeId: testCafe.id,
    drinkId: testDrink.id,
  });
  assert(redemption.status === 'PENDING', `Redemption code generated successfully (status: ${redemption.status}, backup PIN: ${redemption.backup_code})`);

  // ------------------------------------------------------------
  // SECTION 3: OPERATIONS APPLICATION & CAFE USER TESTS
  // ------------------------------------------------------------
  console.log('\n--- 3. OPERATIONS & CAFE USER TESTS ---');

  // 3.1 Admin Login
  const { user: adminUser, token: adminToken } = await loginUser({
    email: 'admin@socialcup.dev',
    password: 'AdminDev123',
  });
  assert(adminUser.role === 'ADMIN', `Admin authenticated successfully (role: ${adminUser.role})`);

  // 3.2 Cafe User PIN Authentication
  const cafeLoginResult = await loginCafeStaff({
    cafeId: testCafe.id,
    pin: '1234',
  });
  assert(cafeLoginResult.user.role === 'BARISTA', `Cafe User authenticated via 4-digit PIN for "${cafeLoginResult.cafe.name}"`);
  assert(cafeLoginResult.cafe.id === testCafe.id, 'Cafe User session is bound to selected cafe ID');

  const cafeJwtPayload = verifyAuthToken(cafeLoginResult.token);
  assert(cafeJwtPayload.cafeId === testCafe.id, 'JWT token contains cryptographically bound cafeId');

  // 3.3 Incorrect PIN rejection
  let pinRejected = false;
  try {
    await loginCafeStaff({ cafeId: testCafe.id, pin: '9999' });
  } catch (err: any) {
    if (err.reason === 'INVALID_PIN') pinRejected = true;
  }
  assert(pinRejected, 'Incorrect cafe PIN is rejected by server with INVALID_PIN');

  // 3.4 Valid Redemption at Authorized Cafe Counter
  const redeemResult = await redeemCode({
    cafeId: testCafe.id,
    token: redemption.token,
    redeemedByUserId: cafeLoginResult.user.id,
  });
  assert(redeemResult.redemption.status === 'REDEEMED', `Redemption validated at authorized counter (status: ${redeemResult.redemption.status})`);
  assert(redeemResult.newBalance === 30 - testDrink.credit_price, `Customer balance accurately deducted by ${testDrink.credit_price} credits (new balance: ${redeemResult.newBalance})`);

  // ------------------------------------------------------------
  // SECTION 4: SECURITY & ISOLATION VERIFICATION
  // ------------------------------------------------------------
  console.log('\n--- 4. SECURITY & CAFE ISOLATION TESTS ---');

  // 4.1 Wrong-cafe redemption rejection
  const otherCafe = nofc || cafes[1];
  const crossRedemption = await createRedemption({
    userId: newMember.id,
    cafeId: testCafe.id,
    drinkId: testDrink.id,
  });

  let wrongCafeRejected = false;
  try {
    // Attempt to redeem testCafe code at otherCafe counter
    await redeemCode({
      cafeId: otherCafe.id,
      token: crossRedemption.token,
    });
  } catch (err: any) {
    if (err.reason === 'WRONG_CAFE') wrongCafeRejected = true;
  }
  assert(wrongCafeRejected, 'Wrong-cafe redemption is rejected with WRONG_CAFE');

  // 4.2 Replay Protection
  let replayRejected = false;
  try {
    await redeemCode({
      cafeId: testCafe.id,
      token: redemption.token, // already redeemed above
    });
  } catch (err: any) {
    if (err.reason === 'REDEMPTION_REDEEMED') replayRejected = true;
  }
  assert(replayRejected, 'Replay protection rejects previously redeemed code');

  // 4.3 Today's Redemptions isolated to current cafe
  const todayList = await getTodayRedemptions(testCafe.id);
  const allBelongToCurrentCafe = todayList.every(r => r.cafe_id === testCafe.id);
  assert(allBelongToCurrentCafe && todayList.length > 0, `Today's redemptions query returned ${todayList.length} records, 100% belonging to ${testCafe.name}`);

  // Clean up throwaway test member & records
  await prisma.redemption.deleteMany({ where: { user_id: newMember.id } });
  await prisma.membership.deleteMany({ where: { user_id: newMember.id } });
  await prisma.user.delete({ where: { id: newMember.id } });

  console.log('\n============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Test execution failed:', e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
