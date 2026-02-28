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
import { RateLimit } from '../rate-limiting';

@Controller('blogs')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @RateLimit('moderate')
  @Post()
  create(@Body() dto: CreateBlogDto, @Req() req: any) {
    return this.blogService.create(dto, req.user.id);
  }

  @RateLimit('generous')
  @Get()
  findAll(@Req() req: any) {
    return this.blogService.findAllByUser(req.user.id);
  }

  @RateLimit('generous')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.blogService.findOneByUser(id, req.user.id);
  }

  @RateLimit('moderate')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto, @Req() req: any) {
    return this.blogService.update(id, dto, req.user.id);
  }

  @RateLimit('moderate')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.blogService.delete(id, req.user.id);
  }
}
