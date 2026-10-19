import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}