CREATE TABLE IF NOT EXISTS compas_meta (
 id INT PRIMARY KEY, lock_version INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
INSERT IGNORE INTO compas_meta (id, lock_version) VALUES (1,0);
CREATE TABLE IF NOT EXISTS compas_users (
 id VARCHAR(32) PRIMARY KEY,
 email VARCHAR(254) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(10) NOT NULL DEFAULT 'teacher',
 auth_version INT NOT NULL DEFAULT 1,
 created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS compas_workspaces (
 user_id VARCHAR(32) PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 version INT NOT NULL DEFAULT 0,
 updated_at BIGINT NOT NULL,
 FOREIGN KEY (user_id) REFERENCES compas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS compas_invites (
 token_hash VARCHAR(64) PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 kind VARCHAR(10) NOT NULL,
 expires_at BIGINT NOT NULL,
 used_at BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS compas_limits (
 bucket VARCHAR(64) PRIMARY KEY,
 attempts INT NOT NULL,
 expires_at BIGINT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS compas_library (
 id INT PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 version INT NOT NULL DEFAULT 0,
 updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO compas_library (id,payload,version,updated_at) VALUES (1,'[]',0,0);
