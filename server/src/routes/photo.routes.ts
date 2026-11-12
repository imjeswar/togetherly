import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { deviceAuthMiddleware, DeviceAuthRequest } from '../middleware/deviceAuth.js';
import { getIO } from '../socket.js';

const router = Router();

// Ensure temporary photos directory exists
const uploadDir = path.resolve('uploads', 'photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// 1. SEND PHOTO TO PARTNER (Supports Multipart file or Base64 payload)
router.post(
  '/send',
  deviceAuthMiddleware,
  upload.single('photo'),
  async (req: DeviceAuthRequest, res: Response) => {
    try {
      const spaceId = req.space!.id;
      const senderDeviceId = req.device!.deviceId;
      const { caption, eventId, photoData } = req.body;

      let photoUrl = '';

      if (req.file) {
        photoUrl = `/uploads/photos/${req.file.filename}`;
      } else if (photoData && typeof photoData === 'string') {
        // Base64 direct transfer
        if (photoData.startsWith('data:image')) {
          const matches = photoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].replace('jpeg', 'jpg');
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, buffer);
            photoUrl = `/uploads/photos/${filename}`;
          } else {
            photoUrl = photoData;
          }
        } else {
          photoUrl = photoData;
        }
      }

      if (!photoUrl) {
        return res.status(400).json({ error: 'Photo image data is required' });
      }

      // Check if partner is online
      const io = getIO();
      let isPartnerOnline = false;
      if (io) {
        const room = io.sockets.adapter.rooms.get(`space_${spaceId}`);
        isPartnerOnline = Boolean(room && room.size > 1);
      }

      const deliveryStatus = isPartnerOnline ? 'DELIVERED' : 'PENDING';

      // Save PhotoTransferMetadata
      const photo = await prisma.photoTransferMetadata.create({
        data: {
          spaceId,
          senderDeviceId,
          photoUrl,
          caption: caption ? String(caption).trim() : null,
          deliveryStatus,
        },
      });

      // Create DeliveryEvent
      const deliveryEvent = await prisma.deliveryEvent.create({
        data: {
          id: eventId || undefined,
          spaceId,
          senderDeviceId,
          eventType: 'PHOTO',
          payload: JSON.stringify({
            photoId: photo.id,
            photoUrl: photo.photoUrl,
            caption: photo.caption,
            senderNickname: req.device!.nickname,
            createdAt: photo.createdAt,
          }),
          mediaUrl: photo.photoUrl,
          status: deliveryStatus,
          deliveredAt: isPartnerOnline ? new Date() : null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Broadcast live to partner if connected
      if (io) {
        io.to(`space_${spaceId}`).emit('incoming_photo', {
          eventId: deliveryEvent.id,
          photoId: photo.id,
          photoUrl: photo.photoUrl,
          caption: photo.caption,
          senderDeviceId,
          senderNickname: req.device!.nickname,
          createdAt: photo.createdAt,
        });

        if (isPartnerOnline) {
          io.to(`device_${senderDeviceId}`).emit('delivery_status_update', {
            eventId: deliveryEvent.id,
            status: 'DELIVERED',
            deliveredAt: new Date(),
          });
        }
      }

      return res.status(201).json({
        success: true,
        photoId: photo.id,
        eventId: deliveryEvent.id,
        photoUrl: photo.photoUrl,
        deliveryStatus,
        photo,
      });
    } catch (error: any) {
      console.error('Send photo error:', error);
      return res.status(500).json({ error: 'Failed to send photo' });
    }
  }
);

// 2. GET PHOTOS GALLERY
router.get('/gallery', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const photos = await prisma.photoTransferMetadata.findMany({
      where: { spaceId: req.space!.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return res.json({
      photos: photos.map((p) => ({
        ...p,
        isFromPartner: p.senderDeviceId !== req.device!.deviceId,
      })),
    });
  } catch (error: any) {
    console.error('Photos gallery error:', error);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// 3. MARK PHOTO AS SEEN
router.post('/:id/seen', deviceAuthMiddleware, async (req: DeviceAuthRequest, res: Response) => {
  try {
    const photo = await prisma.photoTransferMetadata.findFirst({
      where: { id: req.params.id, spaceId: req.space!.id },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.senderDeviceId !== req.device!.deviceId) {
      await prisma.photoTransferMetadata.update({
        where: { id: photo.id },
        data: { deliveryStatus: 'SEEN' },
      });

      // Notify sender
      const io = getIO();
      if (io) {
        io.to(`device_${photo.senderDeviceId}`).emit('delivery_status_update', {
          photoId: photo.id,
          status: 'SEEN',
          seenAt: new Date(),
        });
      }
    }

    return res.json({ success: true, status: 'SEEN' });
  } catch (error: any) {
    console.error('Mark seen error:', error);
    return res.status(500).json({ error: 'Failed to update seen status' });
  }
});

export default router;

