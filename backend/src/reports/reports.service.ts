import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { access, mkdir, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join } from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import { Report } from './entities/report.entity';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { User } from '../users/entities/user.entity';
import { GenerateReportDto } from './dto/generate-report.dto';

const REPORT_TYPE_LABELS: Record<string, string> = {
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  CUSTOM: 'Personnalisé',
};

const WATCH_TYPE_LABELS: Record<string, string> = {
  SCIENTIFIQUE: 'Scientifique',
  REGLEMENTAIRE: 'Réglementaire',
  ACCREDITATION: 'Accréditation',
  NORMATIF: 'Normatif',
  ENVIRONNEMENT: 'Environnement',
  AUTRE: 'Autre',
};

const CRITICALITY_LABELS: Record<string, string> = {
  FAIBLE: 'Faible',
  MOYENNE: 'Moyenne',
  ELEVEE: 'Élevée',
  CRITIQUE: 'Critique',
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(WatchItem) private items: Repository<WatchItem>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async generate(userId: number, dto: GenerateReportDto) {
    const user = await this.users.findOneByOrFail({ id: userId });
    const startDate = new Date(`${dto.periodStart}T00:00:00.000Z`);
    const endDate = new Date(`${dto.periodEnd}T23:59:59.999Z`);
    const rows = await this.items.find({
      where: {
        status: 'PUBLIE',
        publishedAt: Between(startDate, endDate),
      },
      relations: { source: true },
      order: { publishedAt: 'DESC' },
    });

    const reportType = REPORT_TYPE_LABELS[dto.reportType] ?? dto.reportType;
    const title = `Rapport de veille ${reportType.toLowerCase()}`;
    const cleanType = reportType
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const fileName = `rapport-veille-${cleanType}-${dto.periodStart}-au-${dto.periodEnd}-${Date.now()}.${dto.format.toLowerCase()}`;
    const directory = join(process.cwd(), 'storage', 'reports');
    const filePath = join(directory, fileName);
    await mkdir(directory, { recursive: true });

    if (dto.format === 'CSV') {
      await this.writeCsv(filePath, rows);
    } else if (dto.format === 'XLSX') {
      await this.writeExcel(filePath, title, dto, rows);
    } else {
      await this.writePdf(filePath, title, dto, rows);
    }

    return this.reports.save(
      this.reports.create({
        title,
        reportType: dto.reportType,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        format: dto.format,
        filePath,
        status: 'GENERATED',
        createdBy: user,
      }),
    );
  }

  private async writeCsv(filePath: string, rows: WatchItem[]) {
    const escape = (value: unknown) => {
      const raw = String(value ?? '');
      const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const content = [
      ['Titre', 'Source', 'Type de veille', 'Criticité', 'Date de publication', 'Lien'].map(escape).join(';'),
      ...rows.map((item) => [
        item.title,
        item.source?.name,
        WATCH_TYPE_LABELS[item.watchType] ?? item.watchType,
        item.criticality ? CRITICALITY_LABELS[item.criticality] ?? item.criticality : 'Non renseignée',
        this.formatDate(item.publishedAt),
        item.url,
      ].map(escape).join(';')),
    ].join('\r\n');

    await writeFile(filePath, `\uFEFF${content}`, 'utf8');
  }

  private async writeExcel(
    filePath: string,
    title: string,
    dto: GenerateReportDto,
    rows: WatchItem[],
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Plateforme de veille ISO/IEC 17025';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Veilles publiées', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = title;
    sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Période du ${this.formatDate(dto.periodStart)} au ${this.formatDate(dto.periodEnd)} - ${rows.length} élément(s)`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

    const header = sheet.getRow(4);
    header.values = ['Titre', 'Source', 'Type de veille', 'Criticité', 'Date de publication', 'Lien'];
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    header.alignment = { vertical: 'middle' };
    header.height = 24;

    sheet.getColumn(1).width = 55;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 22;
    sheet.getColumn(6).width = 45;

    rows.forEach((item, index) => {
      const row = sheet.addRow([
        item.title,
        item.source?.name ?? 'Non renseignée',
        WATCH_TYPE_LABELS[item.watchType] ?? item.watchType,
        item.criticality ? CRITICALITY_LABELS[item.criticality] ?? item.criticality : 'Non renseignée',
        item.publishedAt ?? null,
        item.url ?? '',
      ]);
      row.alignment = { vertical: 'top', wrapText: true };
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
      row.getCell(5).numFmt = 'dd/mm/yyyy hh:mm';
      if (item.url) row.getCell(6).value = { text: 'Consulter la source', hyperlink: item.url };
    });

    sheet.autoFilter = { from: 'A4', to: `F${Math.max(4, rows.length + 4)}` };
    await workbook.xlsx.writeFile(filePath);
  }

  private async writePdf(
    filePath: string,
    title: string,
    dto: GenerateReportDto,
    rows: WatchItem[],
  ) {
    await new Promise<void>((resolve, reject) => {
      const document = new PDFDocument({ margin: 45, size: 'A4' });
      const stream = createWriteStream(filePath);
      document.pipe(stream);

      document.fillColor('#0f766e').fontSize(21).text(title, { align: 'center' });
      document.moveDown(0.4);
      document.fillColor('#475569').fontSize(10).text(
        `Période du ${this.formatDate(dto.periodStart)} au ${this.formatDate(dto.periodEnd)}`,
        { align: 'center' },
      );
      document.text(`${rows.length} élément(s) publié(s)`, { align: 'center' });
      document.moveDown(1.2);

      if (!rows.length) {
        document.fillColor('#334155').fontSize(11).text('Aucun élément publié pour cette période.', { align: 'center' });
      }

      rows.forEach((item, index) => {
        if (document.y > 700) document.addPage();
        document.fillColor('#0f172a').fontSize(12).text(`${index + 1}. ${item.title}`, { continued: false });
        document.moveDown(0.25);
        document.fillColor('#475569').fontSize(9).text(`Source : ${item.source?.name ?? 'Non renseignée'}`);
        document.text(`Type : ${WATCH_TYPE_LABELS[item.watchType] ?? item.watchType}`);
        document.text(`Criticité : ${item.criticality ? CRITICALITY_LABELS[item.criticality] ?? item.criticality : 'Non renseignée'}`);
        document.text(`Publication : ${this.formatDate(item.publishedAt)}`);
        if (item.url) document.fillColor('#0369a1').text(item.url, { link: item.url, underline: true });
        document.moveDown(0.5);
        document.strokeColor('#cbd5e1').moveTo(45, document.y).lineTo(550, document.y).stroke();
        document.moveDown(0.7);
      });

      document.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private formatDate(value: Date | string | null | undefined) {
    if (!value) return 'Non renseignée';
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return 'Non renseignée';
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  list() {
    return this.reports.find({
      relations: { createdBy: true },
      order: { generatedAt: 'DESC' },
    });
  }

  async getDownload(id: number) {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Rapport introuvable');

    try {
      await access(report.filePath);
    } catch {
      throw new NotFoundException('Le fichier du rapport est introuvable');
    }

    return report;
  }
}
