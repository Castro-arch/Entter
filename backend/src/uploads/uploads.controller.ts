import {
  BadRequestException,
  Controller,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage, type FileFilterCallback } from 'multer';
import { extname, join } from 'path';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { BACKEND_URL, UPLOADS_ROOT } from './uploads.constants';

const ARTWORK_TYPES = /^image\/(png|jpe?g|webp)$/;
const ARTWORK_MAX_BYTES = 8 * 1024 * 1024;
const CERTIFICATE_TYPES = /^application\/pdf$/;
const CERTIFICATE_MAX_BYTES = 15 * 1024 * 1024;
const LOGO_MAX_BYTES = 4 * 1024 * 1024;

/** Organizer-scoped storage: `<UPLOADS_ROOT>/<tenantId>/<uuid>.<ext>`. The
 * guard runs before interceptors in Nest's pipeline, so `req.user` is
 * already populated by the time multer's destination callback fires. */
function multerOptionsFor(allowedTypes: RegExp, maxSizeBytes: number) {
  return {
    storage: diskStorage({
      destination: (req: Request, _file, callback) => {
        const { tenantId } = req.user as JwtPayload;
        const dir = join(UPLOADS_ROOT, tenantId);
        // multer does not create the destination directory itself.
        mkdirSync(dir, { recursive: true });
        callback(null, dir);
      },
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ) => {
      if (!allowedTypes.test(file.mimetype)) {
        callback(
          new UnsupportedMediaTypeException('Tipo de arquivo não suportado.'),
        );
        return;
      }
      callback(null, true);
    },
  };
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('credential-artwork')
  @UseInterceptors(
    FileInterceptor('file', multerOptionsFor(ARTWORK_TYPES, ARTWORK_MAX_BYTES)),
  )
  uploadArtwork(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.toResponse(user, file);
  }

  @Post('certificate-template')
  @UseInterceptors(
    FileInterceptor(
      'file',
      multerOptionsFor(CERTIFICATE_TYPES, CERTIFICATE_MAX_BYTES),
    ),
  )
  uploadCertificateTemplate(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.toResponse(user, file);
  }

  @Post('tenant-logo')
  @UseInterceptors(
    FileInterceptor('file', multerOptionsFor(ARTWORK_TYPES, LOGO_MAX_BYTES)),
  )
  uploadTenantLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.toResponse(user, file);
  }

  private toResponse(user: JwtPayload, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    return { url: `${BACKEND_URL}/uploads/${user.tenantId}/${file.filename}` };
  }
}
