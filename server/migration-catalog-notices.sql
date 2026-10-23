-- Añade preferencias de avisos por publicación, sin borrar datos.
CREATE TABLE IF NOT EXISTS compas_library_receipts (
 user_id VARCHAR(32) NOT NULL,
 coreo_id VARCHAR(100) NOT NULL,
 publication_version BIGINT NOT NULL,
 disposition VARCHAR(10) NOT NULL,
 PRIMARY KEY (user_id,coreo_id),
 FOREIGN KEY (user_id) REFERENCES compas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
