import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  content?: Record<string, unknown>;
}