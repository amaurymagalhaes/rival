import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LikeService } from './like.service';

@Controller('blogs/:id/like')
export class LikeController {
  constructor(private likeService: LikeService) {}

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
}
