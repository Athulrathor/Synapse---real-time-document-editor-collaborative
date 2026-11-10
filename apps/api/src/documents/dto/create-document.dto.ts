import { IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  content?: Record<string, unknown>;
}
