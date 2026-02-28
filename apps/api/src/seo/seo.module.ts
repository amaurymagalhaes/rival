import { Module } from '@nestjs/common';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';
import { BlogModule } from '../blog/blog.module';
import { AnalyzeBlogSeoUseCase } from '../contexts/seo/application/use-cases/analyze-blog-seo.use-case';

@Module({
  imports: [BlogModule],
  controllers: [SeoController],
  providers: [
    SeoService,
    {
      provide: AnalyzeBlogSeoUseCase,
      useFactory: () => new AnalyzeBlogSeoUseCase(),
    },
  ],
})
export class SeoModule {}
