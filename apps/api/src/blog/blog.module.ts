import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController, PublicBlogController } from './blog.controller';

@Module({
  controllers: [BlogController, PublicBlogController],
  providers: [BlogService],
})
export class BlogModule {}
