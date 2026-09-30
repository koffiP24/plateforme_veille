import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1790750000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1790750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "password_reset_tokens" (
      "token_hash" character varying(64) NOT NULL,
      "user_id" integer NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      CONSTRAINT "PK_password_reset_tokens_hash" PRIMARY KEY ("token_hash"),
      CONSTRAINT "UQ_password_reset_tokens_user" UNIQUE ("user_id"),
      CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_expires_at"
      ON "password_reset_tokens" ("expires_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "password_reset_tokens"');
  }
}
