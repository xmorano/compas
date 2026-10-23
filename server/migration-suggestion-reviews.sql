-- Detalles de revisión sin modificar las fichas privadas ni borrar datos.
CREATE TABLE IF NOT EXISTS compas_suggestion_reviews (
 suggestion_id VARCHAR(32) PRIMARY KEY,
 reviewer_id VARCHAR(32) NOT NULL,
 payload MEDIUMTEXT NOT NULL,
 review_note TEXT NOT NULL,
 created_at BIGINT NOT NULL,
 FOREIGN KEY (suggestion_id) REFERENCES compas_suggestions(id) ON DELETE CASCADE,
 FOREIGN KEY (reviewer_id) REFERENCES compas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
