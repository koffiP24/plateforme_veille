import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModule4Qualification1789403962682 implements MigrationInterface {
  name = 'AddModule4Qualification1789403962682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "laboratories" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_941375f58d75bb5cd6d82ea1bf3" UNIQUE ("name"), CONSTRAINT "PK_095d956b8c0841845525483188c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "topics" ("id" SERIAL NOT NULL, "label" character varying(150) NOT NULL, "description" text, "parentId" integer, CONSTRAINT "UQ_86eadc6779d0bee55cf1bf41de8" UNIQUE ("label"), CONSTRAINT "PK_e4aa99a3fa60ec3a37d1fc4e853" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "watch_item_topics" ("watch_item_id" integer NOT NULL, "topic_id" integer NOT NULL, "confidence" numeric(5,4), "origin" character varying(30) NOT NULL DEFAULT 'HUMAN', CONSTRAINT "PK_c04051e40bf20be536ecd7babd1" PRIMARY KEY ("watch_item_id", "topic_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "keyword_synonyms" ("id" SERIAL NOT NULL, "label" character varying(150) NOT NULL, "keyword_id" integer NOT NULL, CONSTRAINT "PK_8f409f674c914dafdc9371857ec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "keywords" ("id" SERIAL NOT NULL, "label" character varying(150) NOT NULL, "weight" numeric(5,2) NOT NULL DEFAULT '1', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_d67fd6b9d6b9052d89c29ef8bab" UNIQUE ("label"), CONSTRAINT "PK_4aa660a7a585ed828da68f3c28e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "watch_item_keywords" ("watch_item_id" integer NOT NULL, "keyword_id" integer NOT NULL, "confidence" numeric(5,4), "origin" character varying(30) NOT NULL DEFAULT 'HUMAN', CONSTRAINT "PK_6ba4b03de4ef3343652a990d100" PRIMARY KEY ("watch_item_id", "keyword_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "domains" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_f36af68a2defaa8ae5fdd9b5640" UNIQUE ("name"), CONSTRAINT "PK_05a6b087662191c2ea7f7ddfc4d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "watch_item_domains" ("watch_item_id" integer NOT NULL, "domain_id" integer NOT NULL, CONSTRAINT "PK_792a03c2025bb75c279d98de398" PRIMARY KEY ("watch_item_id", "domain_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_922c2900b1bb9a014a5617582a" ON "watch_item_domains"  ("watch_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ac9565b6583cbbaa32b555762" ON "watch_item_domains"  ("domain_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "watch_item_laboratories" ("watch_item_id" integer NOT NULL, "laboratory_id" integer NOT NULL, CONSTRAINT "PK_344e656140c9a889d79cafae7c3" PRIMARY KEY ("watch_item_id", "laboratory_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8b84466cfeefb7837509938f3" ON "watch_item_laboratories"  ("watch_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_238e6ba4f545d7e0d357f9d4ee" ON "watch_item_laboratories"  ("laboratory_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_items" ADD "relevance" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_items" ADD "criticality" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "topics" ADD CONSTRAINT "FK_ccd06025206c3d9a29bd61bbfbe" FOREIGN KEY ("parentId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_topics" ADD CONSTRAINT "FK_3c2e293686fbf3bd8b90942680a" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_topics" ADD CONSTRAINT "FK_e8279c8d4475d5fd050c75af27d" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "keyword_synonyms" ADD CONSTRAINT "FK_c2fdb39dd2a01294dc20d87ef8a" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_keywords" ADD CONSTRAINT "FK_102d7abc4b7f94a106117f3690b" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_keywords" ADD CONSTRAINT "FK_f6ae7cc00b1c768ba08a25e864c" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_domains" ADD CONSTRAINT "FK_922c2900b1bb9a014a5617582a2" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_domains" ADD CONSTRAINT "FK_1ac9565b6583cbbaa32b555762d" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_laboratories" ADD CONSTRAINT "FK_d8b84466cfeefb7837509938f3b" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_laboratories" ADD CONSTRAINT "FK_238e6ba4f545d7e0d357f9d4eec" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watch_item_laboratories" DROP CONSTRAINT "FK_238e6ba4f545d7e0d357f9d4eec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_laboratories" DROP CONSTRAINT "FK_d8b84466cfeefb7837509938f3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_domains" DROP CONSTRAINT "FK_1ac9565b6583cbbaa32b555762d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_domains" DROP CONSTRAINT "FK_922c2900b1bb9a014a5617582a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_keywords" DROP CONSTRAINT "FK_f6ae7cc00b1c768ba08a25e864c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_keywords" DROP CONSTRAINT "FK_102d7abc4b7f94a106117f3690b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keyword_synonyms" DROP CONSTRAINT "FK_c2fdb39dd2a01294dc20d87ef8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_topics" DROP CONSTRAINT "FK_e8279c8d4475d5fd050c75af27d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_item_topics" DROP CONSTRAINT "FK_3c2e293686fbf3bd8b90942680a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "topics" DROP CONSTRAINT "FK_ccd06025206c3d9a29bd61bbfbe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_items" DROP COLUMN "criticality"`,
    );
    await queryRunner.query(
      `ALTER TABLE "watch_items" DROP COLUMN "relevance"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_238e6ba4f545d7e0d357f9d4ee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8b84466cfeefb7837509938f3"`,
    );
    await queryRunner.query(`DROP TABLE "watch_item_laboratories"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ac9565b6583cbbaa32b555762"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_922c2900b1bb9a014a5617582a"`,
    );
    await queryRunner.query(`DROP TABLE "watch_item_domains"`);
    await queryRunner.query(`DROP TABLE "domains"`);
    await queryRunner.query(`DROP TABLE "watch_item_keywords"`);
    await queryRunner.query(`DROP TABLE "keywords"`);
    await queryRunner.query(`DROP TABLE "keyword_synonyms"`);
    await queryRunner.query(`DROP TABLE "watch_item_topics"`);
    await queryRunner.query(`DROP TABLE "topics"`);
    await queryRunner.query(`DROP TABLE "laboratories"`);
  }
}
