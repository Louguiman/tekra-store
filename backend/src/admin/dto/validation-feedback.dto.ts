import { IsNotEmpty, IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class ValidationFeedbackDto {
  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsIn(['low', 'medium', 'high'])
  severity: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  suggestedImprovement?: string;
}