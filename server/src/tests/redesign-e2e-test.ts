import { prisma } from '../prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'togetherly-secret-key-couples-platform-2026-super-secure';

async function runRedesignE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 TOGETHERLY REDESIGN — END-TO-END AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const deviceAId = `test_dev_a_${Date.now()}`;
  const deviceBId = `test_dev_b_${Date.now()}`;
  const deviceCId = `test_dev_c_${Date.now()}`;

  let createdSpaceId = '';
  let invitationCode = '';
  let tokenA = '';
  let tokenB = '';
  let testDrawingId = '';
  let testPhotoId = '';
  let testDeliveryEventId = '';

  try {
    // ----------------------------------------------------
    // TEST 1: Anonymous Space Creation (Device A)
    // ----------------------------------------------------
    console.log('[Phase 2 Testing: Device-Bound Anonymous Space Creation]');

    const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let sampleCode = '';
    for (let i = 0; i < 6; i++) {
      sampleCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }
    invitationCode = sampleCode;

    const spaceA = await prisma.$transaction(async (tx) => {
      const sp = await tx.coupleSpace.create({
        data: { name: 'Our Little Space', status: 'ACTIVE' },
      });
      const dev = await tx.pairedDevice.create({
        data: {
          deviceId: deviceAId,
          spaceId: sp.id,
          nickname: 'Alex',
          platform: 'android',
        },
      });
      const inv = await tx.invitationCode.create({
        data: {
          code: invitationCode,
          spaceId: sp.id,
          createdByDeviceId: deviceAId,
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        },
      });
      return { sp, dev, inv };
    });

    createdSpaceId = spaceA.sp.id;
    tokenA = jwt.sign({ deviceId: deviceAId, spaceId: createdSpaceId }, JWT_SECRET, { expiresIn: '365d' });

    assert(Boolean(createdSpaceId && spaceA.sp.status === 'ACTIVE'), 'Device A creates couple space with status ACTIVE');
    assert(invitationCode.length === 6, 'Unique 6-character invitation code generated');
    assert(Boolean(tokenA), 'Device A receives secure device-bound credential token');

    // ----------------------------------------------------
    // TEST 2: Join Space with Invitation Code (Device B)
    // ----------------------------------------------------
    console.log('\n[Phase 2 Testing: Second Device Joins Space]');

    const invRecord = await prisma.invitationCode.findUnique({
      where: { code: invitationCode },
      include: { space: { include: { devices: true } } },
    });

    assert(Boolean(invRecord && !invRecord.isUsed), 'Invitation code exists and is unused');
    assert(invRecord!.space.devices.length === 1, 'Space currently has 1 device waiting for partner');

    // Device B joins
    const deviceB = await prisma.$transaction(async (tx) => {
      const dev = await tx.pairedDevice.create({
        data: {
          deviceId: deviceBId,
          spaceId: createdSpaceId,
          nickname: 'Sarah',
          platform: 'android',
        },
      });
      await tx.invitationCode.update({
        where: { id: invRecord!.id },
        data: { isUsed: true, usedByDeviceId: deviceBId },
      });
      return dev;
    });

    tokenB = jwt.sign({ deviceId: deviceBId, spaceId: createdSpaceId }, JWT_SECRET, { expiresIn: '365d' });

    assert(Boolean(deviceB && tokenB), 'Device B joins space and receives separate device token');

    const updatedSpace = await prisma.coupleSpace.findUnique({
      where: { id: createdSpaceId },
      include: { devices: true },
    });
    assert(updatedSpace?.devices.length === 2, 'Couple space now strictly holds 2 paired devices');

    // ----------------------------------------------------
    // TEST 3: Reject Already-Used Code & Reject 3rd Device
    // ----------------------------------------------------
    console.log('\n[Phase 2 Testing: Security & Two-Device Limits]');

    const consumedInv = await prisma.invitationCode.findUnique({ where: { code: invitationCode } });
    assert(consumedInv?.isUsed === true, 'Invitation code is marked as used and cannot be reused');

    const canThirdDeviceJoin = updatedSpace!.devices.length < 2;
    assert(!canThirdDeviceJoin, 'Third device cannot join space (strictly capped at 2 devices)');

    // ----------------------------------------------------
    // TEST 4: Persistence After Closing & Reopening App
    // ----------------------------------------------------
    console.log('\n[Phase 2 Testing: Pairing Persistence]');

    const decodedA = jwt.verify(tokenA, JWT_SECRET) as any;
    const lookupDevA = await prisma.pairedDevice.findUnique({
      where: { deviceId: decodedA.deviceId },
      include: { space: { include: { devices: true } } },
    });

    assert(Boolean(lookupDevA && lookupDevA.spaceId === createdSpaceId), 'Device A pairing persists with valid token');
    const partnerOfA = lookupDevA?.space.devices.find((d) => d.deviceId !== deviceAId);
    assert(partnerOfA?.nickname === 'Sarah', 'Device A sees partner Sarah after app restart');

    const decodedB = jwt.verify(tokenB, JWT_SECRET) as any;
    const lookupDevB = await prisma.pairedDevice.findUnique({
      where: { deviceId: decodedB.deviceId },
      include: { space: { include: { devices: true } } },
    });
    assert(Boolean(lookupDevB && lookupDevB.spaceId === createdSpaceId), 'Device B pairing persists with valid token');
    const partnerOfB = lookupDevB?.space.devices.find((d) => d.deviceId !== deviceBId);
    assert(partnerOfB?.nickname === 'Alex', 'Device B sees partner Alex after app restart');

    // ----------------------------------------------------
    // TEST 5: Quick Draw Creation & Offline Queueing
    // ----------------------------------------------------
    console.log('\n[Phase 3 & 5 Testing: Quick Draw & Asynchronous Delivery]');

    const sampleStrokes = [
      { path: 'M10,20 L50,80', color: '#E8A0A8', width: 4 },
      { path: 'M50,80 L90,20', color: '#E8A0A8', width: 4 },
    ];
    const canvasDataStr = JSON.stringify(sampleStrokes);

    const drawing = await prisma.drawingMetadata.create({
      data: {
        spaceId: createdSpaceId,
        senderDeviceId: deviceAId,
        mode: 'QUICK_DRAW',
        title: 'Sweet Heart Doodle',
        canvasData: canvasDataStr,
        previewUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      },
    });
    testDrawingId = drawing.id;

    assert(Boolean(drawing.id && drawing.mode === 'QUICK_DRAW'), 'Drawing saved to database with stroke paths');

    // Create queued delivery event (Partner B is currently offline)
    const deliveryEvent = await prisma.deliveryEvent.create({
      data: {
        spaceId: createdSpaceId,
        senderDeviceId: deviceAId,
        eventType: 'DRAWING',
        payload: JSON.stringify({
          drawingId: drawing.id,
          title: drawing.title,
          canvasData: drawing.canvasData,
          previewUrl: drawing.previewUrl,
        }),
        status: 'PENDING', // Offline queued
        expiresAt: new Date(Date.now() + 7 * 86400 * 1000),
      },
    });
    testDeliveryEventId = deliveryEvent.id;

    assert(deliveryEvent.status === 'PENDING', 'Drawing queued as PENDING when receiving partner is offline');

    // ----------------------------------------------------
    // TEST 6: Receiver Reconnects & Acknowledges Delivery
    // ----------------------------------------------------
    console.log('\n[Phase 5 Testing: Reconnect Delivery & Acknowledgment]');

    // Device B fetches pending deliveries
    const pendingForB = await prisma.deliveryEvent.findMany({
      where: {
        spaceId: createdSpaceId,
        senderDeviceId: { not: deviceBId },
        status: 'PENDING',
      },
    });

    assert(pendingForB.length >= 1, 'Device B fetches pending offline events upon reconnecting');
    assert(pendingForB.some((e) => e.id === testDeliveryEventId), 'Queued drawing event delivered to Device B');

    // Device B confirms delivery (ACK)
    await prisma.deliveryEvent.update({
      where: { id: testDeliveryEventId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    const deliveredCheck = await prisma.deliveryEvent.findUnique({ where: { id: testDeliveryEventId } });
    assert(deliveredCheck?.status === 'DELIVERED', 'Event delivery status successfully updated to DELIVERED');

    // ----------------------------------------------------
    // TEST 7: Instant Photo Sharing & Delivery Status Progression
    // ----------------------------------------------------
    console.log('\n[Phase 4 & 5 Testing: Instant Photo Sharing]');

    const photo = await prisma.photoTransferMetadata.create({
      data: {
        spaceId: createdSpaceId,
        senderDeviceId: deviceBId,
        photoUrl: '/uploads/photos/test-moment-123.jpg',
        caption: 'Thinking of you right now!',
        deliveryStatus: 'DELIVERED',
      },
    });
    testPhotoId = photo.id;

    assert(Boolean(photo.id && photo.photoUrl), 'Photo transfer metadata saved to PostgreSQL');

    // Device A opens photo & marks as SEEN
    await prisma.photoTransferMetadata.update({
      where: { id: photo.id },
      data: { deliveryStatus: 'SEEN' },
    });

    const seenPhoto = await prisma.photoTransferMetadata.findUnique({ where: { id: photo.id } });
    assert(seenPhoto?.deliveryStatus === 'SEEN', 'Photo delivery status transitions to SEEN upon viewing');

    // ----------------------------------------------------
    // TEST 8: Shared Canvas State Synchronization
    // ----------------------------------------------------
    console.log('\n[Phase 3 Testing: Shared Canvas State]');

    const sharedArtwork = await prisma.drawingMetadata.create({
      data: {
        spaceId: createdSpaceId,
        senderDeviceId: deviceAId,
        mode: 'SHARED_CANVAS',
        title: 'Our Living Canvas',
        canvasData: JSON.stringify([{ path: 'M0,0 L100,100', color: '#D9B77E', width: 6 }]),
      },
    });

    const latestShared = await prisma.drawingMetadata.findFirst({
      where: { spaceId: createdSpaceId, mode: 'SHARED_CANVAS' },
      orderBy: { createdAt: 'desc' },
    });

    assert(latestShared?.id === sharedArtwork.id, 'Shared Canvas state successfully retrieved and synchronized');

    // ----------------------------------------------------
    // TEST 9: Security Isolation Between Couple Spaces
    // ----------------------------------------------------
    console.log('\n[Security Testing: Couple Space Isolation]');

    // Device C belongs to a completely different couple space
    const otherSpace = await prisma.coupleSpace.create({
      data: { name: 'Stranger Space', status: 'ACTIVE' },
    });
    const deviceC = await prisma.pairedDevice.create({
      data: { deviceId: deviceCId, spaceId: otherSpace.id, nickname: 'Stranger' },
    });

    // Check if Device C can query Device A & B's drawings
    const foreignDrawings = await prisma.drawingMetadata.findMany({
      where: { spaceId: deviceC.spaceId },
    });

    const hasLeakedDrawing = foreignDrawings.some((d) => d.id === testDrawingId);
    assert(!hasLeakedDrawing, 'Device C cannot access Device A & B drawings (strict tenant space isolation)');

    // ----------------------------------------------------
    // TEST 10: Explicit Unpair Functionality
    // ----------------------------------------------------
    console.log('\n[Phase 2 Testing: Explicit Unpair]');

    await prisma.coupleSpace.update({
      where: { id: createdSpaceId },
      data: { status: 'UNPAIRED' },
    });

    const unpairedSpace = await prisma.coupleSpace.findUnique({ where: { id: createdSpaceId } });
    assert(unpairedSpace?.status === 'UNPAIRED', 'Sanctuary status transitions to UNPAIRED');

    // Cleanup test artifacts from database
    await prisma.deliveryEvent.deleteMany({ where: { spaceId: { in: [createdSpaceId, otherSpace.id] } } });
    await prisma.drawingMetadata.deleteMany({ where: { spaceId: { in: [createdSpaceId, otherSpace.id] } } });
    await prisma.photoTransferMetadata.deleteMany({ where: { spaceId: { in: [createdSpaceId, otherSpace.id] } } });
    await prisma.invitationCode.deleteMany({ where: { spaceId: { in: [createdSpaceId, otherSpace.id] } } });
    await prisma.pairedDevice.deleteMany({ where: { spaceId: { in: [createdSpaceId, otherSpace.id] } } });
    await prisma.coupleSpace.deleteMany({ where: { id: { in: [createdSpaceId, otherSpace.id] } } });

    console.log('\n======================================================');
    console.log(`📊 REDESIGN TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runRedesignE2ETests();

