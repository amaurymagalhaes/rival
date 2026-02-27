import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('blogs')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @Post()
  create(@Body() dto: CreateBlogDto, @Req() req: any) {
    return this.blogService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.blogService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.blogService.findOneByUser(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto, @Req() req: any) {
    return this.blogService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.blogService.delete(id, req.user.id);
  }
}

@Controller('public/blogs')
export class PublicBlogController {
  constructor(private blogService: BlogService) {}

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }
}
