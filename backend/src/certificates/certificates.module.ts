import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatesWorker } from './certificates.worker';

@Module({
  imports: [EmailModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatesWorker],
})
export class CertificatesModule {}
