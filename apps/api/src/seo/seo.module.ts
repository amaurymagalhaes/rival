import { Module } from '@nestjs/common';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';
import { BlogModule } from '../blog/blog.module';

@Module({
  imports: [BlogModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
