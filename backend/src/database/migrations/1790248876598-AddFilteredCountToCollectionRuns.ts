import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFilteredCountToCollectionRuns1790248876598 implements MigrationInterface {
    name = 'AddFilteredCountToCollectionRuns1790248876598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "collection_runs" ADD COLUMN IF NOT EXISTS "filtered_count" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "collection_runs" DROP COLUMN "filtered_count"`);
    }

}
