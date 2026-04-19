import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../tomes/tome-at';
import { FirmService } from './firm.service';

@Controller('firms')
export class FirmController {
  constructor(private readonly firmService: FirmService) {}

  @UseGuards(JwtAuthGuard)
  @Post('seed-default')
  async seedDefault() {
    return this.firmService.seedDefault();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: {
    slug: string; name: string; ownerEmail: string;
    ownerPhone?: string; planType?: string;
  }) {
    return this.firmService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.firmService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.firmService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.firmService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/users/:userId')
  async assignUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.firmService.assignUserToFirm(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/users')
  async listUsers(@Param('id') id: string) {
    return this.firmService.listFirmUsers(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/dossiers')
  async listDossiers(@Param('id') id: string) {
    return this.firmService.listFirmDossiers(id);
  }
}
