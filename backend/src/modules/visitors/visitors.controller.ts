import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Visitors')
@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get('qr/:token/:visitorId')
  @ApiOperation({ summary: 'Public: gate QR code as PNG (append .png optional)' })
  async getQr(
    @Param('token') token: string,
    @Param('visitorId') visitorId: string,
    @Res() res: Response,
  ) {
    const id = visitorId.replace(/\.png$/i, '');
    const { png, filename } = await this.visitorsService.getQrPng(token, id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(png.length));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    // ?download=1 forces a save dialog (visitor page "Download" button); default stays inline
    const disposition = (res.req as any)?.query?.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.end(png);
  }

  @Get('particulars/:filename')
  @ApiOperation({ summary: 'Serve an inspection particulars evidence image' })
  getParticularImage(@Param('filename') filename: string, @Res() res: Response) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) throw new BadRequestException('Invalid image name');
    const filepath = path.join(process.env.PHOTO_STORAGE_PATH || '/data/photos', 'particulars', filename);
    if (!fs.existsSync(filepath)) throw new BadRequestException('Image not found');
    return res.sendFile(filepath);
  }

  @Get('photo/:filename')
  @ApiOperation({ summary: 'Serve stored visitor photo' })
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filepath = await this.visitorsService.getPhoto(filename);
    res.sendFile(filepath);
  }
}
