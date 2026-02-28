import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../rate-limiting';

@Controller()
export class CommentController {
  constructor(private commentService: CommentService) {}

  @RateLimit('moderate')
  @Post('blogs/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('id') blogId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentService.create(blogId, req.user.id, dto);
  }

  @Public()
  @RateLimit('generous')
  @Get('public/blogs/:slug/comments')
  findByBlogSlug(@Param('slug') slug: string) {
    return this.commentService.findByBlogSlug(slug);
  }
}
