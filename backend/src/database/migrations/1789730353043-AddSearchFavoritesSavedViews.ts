import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchFavoritesSavedViews1789730353043 implements MigrationInterface {
    name = 'AddSearchFavoritesSavedViews1789730353043'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "favorites" ("user_id" integer NOT NULL, "watch_item_id" integer NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9f914afe7c0b897ebfba03e9c86" PRIMARY KEY ("user_id", "watch_item_id"))`);
        await queryRunner.query(`CREATE TABLE "saved_views" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "filters" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "PK_30acd4fbe2058d97631ab9bb2b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_83e8d4fcc0d571e87ad1489deb0" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_views" ADD CONSTRAINT "FK_5ef69747737eae659eb1dd15aac" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_watch_items_fts" ON "watch_items" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("summary", '')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_watch_items_fts"`);
        await queryRunner.query(`ALTER TABLE "saved_views" DROP CONSTRAINT "FK_5ef69747737eae659eb1dd15aac"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_83e8d4fcc0d571e87ad1489deb0"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593"`);
        await queryRunner.query(`DROP TABLE "saved_views"`);
        await queryRunner.query(`DROP TABLE "favorites"`);
    }

}
