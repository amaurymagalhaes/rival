import { IsString, MinLength, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class UpdateBlogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
