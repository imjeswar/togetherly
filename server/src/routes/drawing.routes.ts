import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { deviceAuthMiddleware, DeviceAuthRequest } from '../middleware/deviceAuth.js';
import { getIO } from '../socket.js';

const router = Router();

// 1. SEND QUICK DRAW TO PARTNER
router.post('/send', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const { eventId, canvasData, previewData, title = 'Sweet Drawing' } = req.body;

    if (!canvasData) {
      return res.status(400).json({ error: 'Canvas data is required' });
    }

    const spaceId = req.space!.id;
    const senderDeviceId = req.device!.deviceId;

    // Save drawing metadata
    const drawing = await prisma.drawingMetadata.create({
      data: {
        spaceId,
        senderDeviceId,
        mode: 'QUICK_DRAW',
        title,
        canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
        previewUrl: previewData || null,
      },
    });

    // Check if partner is connected to space room
    const io = getIO();
    let isPartnerOnline = false;
    if (io) {
      const room = io.sockets.adapter.rooms.get(`space_${spaceId}`);
      // If room has > 1 socket (i.e. both partners connected), partner is online
      isPartnerOnline = Boolean(room && room.size > 1);
    }

    const deliveryStatus = isPartnerOnline ? 'DELIVERED' : 'PENDING';

    // Create asynchronous DeliveryEvent
    const deliveryEvent = await prisma.deliveryEvent.create({
      data: {
        id: eventId || undefined,
        spaceId,
        senderDeviceId,
        eventType: 'DRAWING',
        payload: JSON.stringify({
          drawingId: drawing.id,
          title: drawing.title,
          canvasData: drawing.canvasData,
          previewUrl: drawing.previewUrl,
          senderNickname: req.device!.nickname,
          createdAt: drawing.createdAt,
        }),
        status: deliveryStatus,
        deliveredAt: isPartnerOnline ? new Date() : null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      },
    });

    // If partner is online, broadcast immediately
    if (io) {
      io.to(`space_${spaceId}`).emit('incoming_drawing', {
        eventId: deliveryEvent.id,
        drawingId: drawing.id,
        title: drawing.title,
        canvasData: drawing.canvasData,
        previewUrl: drawing.previewUrl,
        senderDeviceId,
        senderNickname: req.device!.nickname,
        createdAt: drawing.createdAt,
      });

      if (isPartnerOnline) {
        // Emit delivery ack back to sender
        io.to(`device_${senderDeviceId}`).emit('delivery_status_update', {
          eventId: deliveryEvent.id,
          status: 'DELIVERED',
          deliveredAt: new Date(),
        });
      }
    }

    return res.status(201).json({
      success: true,
      drawingId: drawing.id,
      eventId: deliveryEvent.id,
      deliveryStatus,
      drawing: {
        id: drawing.id,
        title: drawing.title,
        previewUrl: drawing.previewUrl,
        createdAt: drawing.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Send drawing error:', error);
    return res.status(500).json({ error: 'Failed to send drawing' });
  }
});

// 2. GET DRAWINGS GALLERY (RECEIVED & SENT)
router.get('/gallery', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const drawings = await prisma.drawingMetadata.findMany({
      where: { spaceId: req.space!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        senderDeviceId: true,
        mode: true,
        title: true,
        previewUrl: true,
        createdAt: true,
      },
    });

    return res.json({
      drawings: drawings.map((d) => ({
        ...d,
        isFromPartner: d.senderDeviceId !== req.device!.deviceId,
      })),
    });
  } catch (error: any) {
    console.error('Get drawings gallery error:', error);
    return res.status(500).json({ error: 'Failed to fetch drawings gallery' });
  }
});

// 3. GET SINGLE DRAWING FULL DETAILS
router.get('/:id', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const drawing = await prisma.drawingMetadata.findFirst({
      where: {
        id: req.params.id,
        spaceId: req.space!.id,
      },
    });

    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }

    return res.json({
      drawing: {
        ...drawing,
        isFromPartner: drawing.senderDeviceId !== req.device!.deviceId,
      },
    });
  } catch (error: any) {
    console.error('Get single drawing error:', error);
    return res.status(500).json({ error: 'Failed to fetch drawing details' });
  }
});

// 4. SHARED CANVAS: GET STATE
router.get('/shared/state', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const latestShared = await prisma.drawingMetadata.findFirst({
      where: {
        spaceId: req.space!.id,
        mode: 'SHARED_CANVAS',
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      sharedCanvas: latestShared || null,
    });
  } catch (error: any) {
    console.error('Get shared canvas error:', error);
    return res.status(500).json({ error: 'Failed to fetch shared canvas' });
  }
});

// 5. SHARED CANVAS: SAVE / SYNC STATE
router.post('/shared/save', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const { canvasData, previewData, title = 'Our Shared Canvas' } = req.body;

    if (!canvasData) {
      return res.status(400).json({ error: 'Canvas data required' });
    }

    const spaceId = req.space!.id;
    const senderDeviceId = req.device!.deviceId;

    const saved = await prisma.drawingMetadata.create({
      data: {
        spaceId,
        senderDeviceId,
        mode: 'SHARED_CANVAS',
        title,
        canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
        previewUrl: previewData || null,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`space_${spaceId}`).emit('shared_canvas_saved', {
        drawingId: saved.id,
        previewUrl: saved.previewUrl,
        savedBy: req.device!.nickname,
      });
    }

    return res.json({ success: true, drawingId: saved.id });
  } catch (error: any) {
    console.error('Save shared canvas error:', error);
    return res.status(500).json({ error: 'Failed to save shared canvas' });
  }
});

export default router;

