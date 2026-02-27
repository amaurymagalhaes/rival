import { IsString, MinLength, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
