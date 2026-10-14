import { BadRequestException, Controller, Param, ParseIntPipe, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WatchItemsService } from '../watch-items/watch-items.service';
import { DeepLService } from './deepl.service';

@Controller('api/v1/watch-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WatchItemTranslationController {
  constructor(
    private readonly watchItemsService: WatchItemsService,
    private readonly deepLService: DeepLService,
  ) {}

  @Post(':id/translate-en')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE', 'OPERATEUR_VEILLE', 'LECTEUR')
  async translateFrenchItemToEnglish(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { roles: string[] } },
  ) {
    const item = await this.watchItemsService.findOneForRoles(id, request.user.roles ?? []);
    if (item.englishTitle) return item;

    const sourceLanguage = item.originalLanguage ?? item.language;
    if (!/^fr(?:-|$)/i.test(sourceLanguage ?? '')) {
      throw new BadRequestException('La traduction vers l’anglais est disponible pour les contenus français.');
    }

    try {
      const translation = await this.deepLService.translateFrenchToEnglish({
        title: item.originalTitle ?? item.frenchTitle ?? item.title,
        summary: item.originalSummary ?? item.frenchSummary ?? item.summary,
      });
      return this.watchItemsService.saveEnglishTranslation(id, translation);
    } catch {
      throw new ServiceUnavailableException('La traduction est temporairement indisponible. Vérifiez la configuration DeepL.');
    }
  }
}
