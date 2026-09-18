import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModule5ValidationTracking1789576535050 implements MigrationInterface {
    name = 'AddModule5ValidationTracking1789576535050'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "actions" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "description" text, "action_type" character varying(50) NOT NULL, "impact" text, "decision" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "due_date" date, "status" character varying(30) NOT NULL DEFAULT 'OPEN', "watch_item_id" integer NOT NULL, "owner_id" integer NOT NULL, CONSTRAINT "PK_7bfb822f56be449c0b8adbf83cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "status" character varying(50) NOT NULL, "relevance" integer, "criticality" character varying(20), "comment" text, "reviewed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "watch_item_id" integer NOT NULL, "reviewer_id" integer NOT NULL, CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "actions" ADD CONSTRAINT "FK_29b944e0a0c031a1ca8d2cdf6da" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "actions" ADD CONSTRAINT "FK_ddb2f8ec375b8341af97eb02386" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_23c44795684c435ac46dcefd5ea" FOREIGN KEY ("watch_item_id") REFERENCES "watch_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_92e950a2513a79bb3fab273c92e"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_23c44795684c435ac46dcefd5ea"`);
        await queryRunner.query(`ALTER TABLE "actions" DROP CONSTRAINT "FK_ddb2f8ec375b8341af97eb02386"`);
        await queryRunner.query(`ALTER TABLE "actions" DROP CONSTRAINT "FK_29b944e0a0c031a1ca8d2cdf6da"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "actions"`);
    }

}
