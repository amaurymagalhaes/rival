import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { RateLimit } from '../rate-limiting';

@Controller('blogs/:id/like')
export class LikeController {
  constructor(private likeService: LikeService) {}

  @RateLimit('moderate')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  like(@Param('id') blogId: string, @Req() req: any) {
    return this.likeService.like(blogId, req.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  unlike(@Param('id') blogId: string, @Req() req: any) {
    return this.likeService.unlike(blogId, req.user.id);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  getStatus(@Param('id') blogId: string, @Req() req: any) {
    return this.likeService.getStatus(blogId, req.user.id);
  }
}
