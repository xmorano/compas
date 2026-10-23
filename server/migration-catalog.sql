-- Ejecutar una vez en la base de datos existente; no borra datos.
CREATE TABLE IF NOT EXISTS compas_library_seen (
 user_id VARCHAR(32) NOT NULL,
 coreo_id VARCHAR(100) NOT NULL,
 PRIMARY KEY (user_id,coreo_id),
 FOREIGN KEY (user_id) REFERENCES compas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS compas_suggestions (
 id VARCHAR(32) PRIMARY KEY,
 user_id VARCHAR(32) NOT NULL,
 source_id VARCHAR(100) NOT NULL,
 payload MEDIUMTEXT NOT NULL,
 status VARCHAR(10) NOT NULL DEFAULT 'pending',
 created_at BIGINT NOT NULL,
 reviewed_at BIGINT NULL,
 UNIQUE KEY user_source (user_id,source_id),
 FOREIGN KEY (user_id) REFERENCES compas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
