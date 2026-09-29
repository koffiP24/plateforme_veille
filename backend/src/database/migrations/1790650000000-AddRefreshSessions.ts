import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshSessions1790650000000 implements MigrationInterface {
  name = 'AddRefreshSessions1790650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "refresh_sessions" (
      "id" uuid NOT NULL,
      "token_hash" character varying(64) NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "user_id" integer NOT NULL,
      CONSTRAINT "PK_refresh_sessions_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_sessions_expires_at"
      ON "refresh_sessions" ("expires_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "refresh_sessions"');
  }
}
