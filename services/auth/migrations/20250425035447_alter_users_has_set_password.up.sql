-- alter user schema

ALTER TABLE {{ index .Options "Namespace" }}.users
ADD COLUMN IF NOT EXISTS is_non_default_password boolean NOT NULL DEFAULT false;
