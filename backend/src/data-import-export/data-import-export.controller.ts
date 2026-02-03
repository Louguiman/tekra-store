import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { DataImportExportService, ImportResult } from './data-import-export.service';
import { ImportDataDto } from './dto/import-product.dto';
import { ExportDataDto, ExportFormat, ExportType } from './dto/export-data.dto';

@Controller('admin/data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DataImportExportController {
  constructor(
    private readonly dataImportExportService: DataImportExportService,
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importData(@Body() importData: ImportDataDto): Promise<ImportResult> {
    return await this.dataImportExportService.importProductData(importData);
  }

  @Post('import/file')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') fileType: 'json' | 'csv',
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!fileType || !['json', 'csv'].includes(fileType)) {
      throw new BadRequestException('File type must be json or csv');
    }

    const fileContent = file.buffer.toString('utf-8');
    return await this.dataImportExportService.importFromFile(fileContent, fileType);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateImportData(@Body() importData: ImportDataDto): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors = await this.dataImportExportService.validateImportData(importData);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  @Get('export')
  async exportData(
    @Query('type') type: ExportType = ExportType.PRODUCTS,
    @Query('format') format: ExportFormat = ExportFormat.JSON,
    @Query('countries') countries?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const exportDto: ExportDataDto = {
      type,
      format,
      countryFilters: countries ? countries.split(',') : undefined,
      dateFrom,
      dateTo,
    };

    const data = await this.dataImportExportService.exportData(exportDto);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === ExportFormat.JSON ? 'json' : 'csv';
    const filename = `${type}_export_${timestamp}.${extension}`;
    
    // Set content type
    const contentType = format === ExportFormat.JSON 
      ? 'application/json' 
      : 'text/csv';

    return {
      data,
      filename,
      contentType
    };
  }

  @Get('template')
  async getImportTemplate(
    @Query('format') format: 'json' | 'csv' = 'json',
  ): Promise<{ template: string; filename: string; contentType: string }> {
    if (!['json', 'csv'].includes(format)) {
      throw new BadRequestException('Format must be json or csv');
    }

    const template = await this.dataImportExportService.getImportTemplate(format);
    
    const filename = `import_template.${format}`;
    const contentType = format === 'json' ? 'application/json' : 'text/csv';

    return {
      template,
      filename,
      contentType
    };
  }

  @Get('status')
  async getImportExportStatus(): Promise<{
    supportedFormats: string[];
    supportedExportTypes: string[];
    maxFileSize: string;
  }> {
    return {
      supportedFormats: ['json', 'csv'],
      supportedExportTypes: Object.values(ExportType),
      maxFileSize: '10MB'
    };
  }
}