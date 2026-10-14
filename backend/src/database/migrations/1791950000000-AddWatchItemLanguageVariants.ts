import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWatchItemLanguageVariants1791950000000 implements MigrationInterface {
  name = 'AddWatchItemLanguageVariants1791950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "watch_items"
      ADD COLUMN "original_title" text,
      ADD COLUMN "original_summary" text,
      ADD COLUMN "original_language" character varying(20),
      ADD COLUMN "french_title" text,
      ADD COLUMN "french_summary" text,
      ADD COLUMN "english_title" text,
      ADD COLUMN "english_summary" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "watch_items"
      DROP COLUMN "english_summary",
      DROP COLUMN "english_title",
      DROP COLUMN "french_summary",
      DROP COLUMN "french_title",
      DROP COLUMN "original_language",
      DROP COLUMN "original_summary",
      DROP COLUMN "original_title"`);
  }
}
