import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { deviceAuthMiddleware, DeviceAuthRequest } from '../middleware/deviceAuth.js';
import { getIO } from '../socket.js';

const router = Router();

// 1. GET PENDING OFFLINE EVENTS FOR THIS DEVICE
router.get('/pending', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const spaceId = req.space!.id;
    const currentDeviceId = req.device!.deviceId;

    // Events sent by partner that are pending delivery to this device
    const pendingEvents = await prisma.deliveryEvent.findMany({
      where: {
        spaceId,
        senderDeviceId: { not: currentDeviceId },
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    const parsedEvents = pendingEvents.map((evt) => {
      let data = {};
      try {
        data = JSON.parse(evt.payload);
      } catch {
        data = { raw: evt.payload };
      }
      return {
        id: evt.id,
        eventType: evt.eventType,
        data,
        mediaUrl: evt.mediaUrl,
        createdAt: evt.createdAt,
      };
    });

    return res.json({ events: parsedEvents });
  } catch (error: any) {
    console.error('Fetch pending delivery error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending delivery events' });
  }
});

// 2. ACKNOWLEDGE DELIVERY (Mark DELIVERED)
router.post('/ack', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const { eventIds } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds array required' });
    }

    const spaceId = req.space!.id;

    // Update events to DELIVERED
    await prisma.deliveryEvent.updateMany({
      where: {
        id: { in: eventIds },
        spaceId,
        status: 'PENDING',
      },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    // Notify sender devices
    const io = getIO();
    if (io) {
      const updatedEvents = await prisma.deliveryEvent.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, senderDeviceId: true },
      });

      for (const evt of updatedEvents) {
        io.to(`device_${evt.senderDeviceId}`).emit('delivery_status_update', {
          eventId: evt.id,
          status: 'DELIVERED',
          deliveredAt: new Date(),
        });
      }
    }

    return res.json({ success: true, count: eventIds.length });
  } catch (error: any) {
    console.error('Ack delivery error:', error);
    return res.status(500).json({ error: 'Failed to acknowledge delivery' });
  }
});

// 3. MARK CONTENT SEEN
router.post('/seen', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const { eventIds } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds array required' });
    }

    const spaceId = req.space!.id;

    await prisma.deliveryEvent.updateMany({
      where: {
        id: { in: eventIds },
        spaceId,
      },
      data: {
        status: 'SEEN',
        seenAt: new Date(),
      },
    });

    const io = getIO();
    if (io) {
      const events = await prisma.deliveryEvent.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, senderDeviceId: true },
      });

      for (const evt of events) {
        io.to(`device_${evt.senderDeviceId}`).emit('delivery_status_update', {
          eventId: evt.id,
          status: 'SEEN',
          seenAt: new Date(),
        });
      }
    }

    return res.json({ success: true, count: eventIds.length });
  } catch (error: any) {
    console.error('Seen delivery error:', error);
    return res.status(500).json({ error: 'Failed to mark delivery seen' });
  }
});

export default router;

