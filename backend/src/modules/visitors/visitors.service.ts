import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { InviteStatus, VisitStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { publicFrontendBase } from '../../common/utils/urls';
import { buildGateQrPayload } from '../../common/utils/qr';
import { linkSameDayVisits } from '../../common/utils/visitor-pass';
import { gatePassCaption, qrFileName, renderCaptionedQrPng } from '../../common/utils/qr-caption';

function isLocalUrl(u: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(u);
}

@Injectable()
export class VisitorsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  private getPhotoDir() {
    const dir = process.env.PHOTO_STORAGE_PATH || '/data/photos';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /** v24 lock: the photo can only be (re)taken before the guest arrives or passes any checkpoint. */
  static readonly PHOTO_LOCKED = 'Your photo can no longer be changed - please see the gate officer.';

  /**
   * Fresh, scan-optimised QR PNG for a registered visitor. Public but gated by the
   * unguessable invite token (same access level as the visitor page itself).
   * Used for the email "open image" link and the "Download QR" button.
   */
  async getQrPng(token: string, visitorId: string): Promise<{ png: Buffer; filename: string }> {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        visitors: { where: { id: visitorId } },
        organisation: { select: { name: true } },
      },
    });
    const visitor = invite?.visitors?.[0];
    if (!invite || !visitor) throw new NotFoundException('QR code not found');
    if (!visitor.photoPath) {
      throw new BadRequestException('Photo not captured yet — QR is issued after registration');
    }
    const locationName = invite.locationId
      ? (await this.prisma.location.findUnique({ where: { id: invite.locationId }, select: { name: true } }))?.name
      : undefined;
    const date = invite.expectedAt || visitor.createdAt;
    return {
      png: renderCaptionedQrPng(
        buildGateQrPayload(visitor.id, invite.passphrase, invite.token, (visitor as any).passToken),
        gatePassCaption({
          fullName: visitor.fullName,
          visitorId: visitor.id,
          date,
          orgName: invite.organisation?.name,
          locationName,
        }),
      ),
      filename: qrFileName(visitor.fullName, date),
    };
  }

  async getPhoto(filename: string) {
    // basename() blocks encoded path traversal (e.g. ..%2F..%2Fetc) — only files in the photo dir.
    const safe = path.basename(String(filename || ''));
    if (!safe || safe.startsWith('.')) throw new NotFoundException('Photo not found');
    const filepath = path.join(this.getPhotoDir(), safe);
    if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
      throw new NotFoundException('Photo not found');
    }
    return filepath;
  }
}
