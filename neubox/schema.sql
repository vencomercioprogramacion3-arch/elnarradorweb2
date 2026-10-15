-- Esquema MySQL/MariaDB de El Narrador (sitio web) para el hosting Neubox.
-- Importar en phpMyAdmin: selecciona la base de datos > pestaña "Importar".
--
-- Notas:
-- * Todas las fechas se guardan en UTC (el sitio las escribe así).
-- * Los BOOLEAN son TINYINT(1): 1 = sí, 0 = no.
-- * `tags` guarda un arreglo JSON, p.ej. ["política","cdmx"].

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(100) NOT NULL,          -- slug, p.ej. 'mexico'
  name        VARCHAR(150) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id             VARCHAR(64)  NOT NULL,        -- UUID o 'wp-123' para notas de WordPress
  source         VARCHAR(20)  NOT NULL DEFAULT 'supabase',  -- 'supabase' (panel) o 'wordpress'
  title          VARCHAR(500) NOT NULL,
  summary        TEXT,
  content        LONGTEXT,
  image_url      VARCHAR(1000) NOT NULL DEFAULT '',
  category_slug  VARCHAR(100) NOT NULL DEFAULT '',
  category_name  VARCHAR(150) NOT NULL DEFAULT '',
  author_name    VARCHAR(200) NOT NULL DEFAULT '',
  tags           JSON NULL,
  published_at   DATETIME NOT NULL,
  created_at     DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  view_count     INT NOT NULL DEFAULT 0,
  is_featured    TINYINT(1) NOT NULL DEFAULT 0,
  is_breaking    TINYINT(1) NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL DEFAULT 'published',
  source_url     VARCHAR(1000) NULL,
  PRIMARY KEY (id),
  KEY idx_news_published (published_at),
  KEY idx_news_category (category_slug, published_at),
  KEY idx_news_featured (is_featured, published_at),
  KEY idx_news_breaking (is_breaking, published_at),
  KEY idx_news_views (view_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS magazines (
  id               VARCHAR(64)  NOT NULL,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  edition          VARCHAR(100) NOT NULL DEFAULT '',
  cover_image_url  VARCHAR(1000) NOT NULL DEFAULT '',
  pdf_url          VARCHAR(1000) NOT NULL DEFAULT '',
  published_at     DATETIME NOT NULL,
  created_at       DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  is_featured      TINYINT(1) NOT NULL DEFAULT 0,
  view_count       INT NOT NULL DEFAULT 0,
  download_count   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_magazines_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios del panel /admin. password_hash lo genera el sitio (o
-- `node scripts/hash-password.mjs`); nunca guardar contraseñas en claro.
CREATE TABLE IF NOT EXISTS admin_users (
  id             VARCHAR(64)  NOT NULL,
  email          VARCHAR(191) NOT NULL,        -- siempre en minúsculas
  display_name   VARCHAR(200) NOT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'writer',  -- owner / editor / writer
  password_hash  VARCHAR(255) NULL,
  created_at     DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS authors (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(200) NOT NULL,
  bio         TEXT NULL,
  avatar_url  VARCHAR(1000) NULL,
  email       VARCHAR(191) NULL,
  created_at  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_authors (
  news_id    VARCHAR(64) NOT NULL,
  author_id  VARCHAR(64) NOT NULL,
  PRIMARY KEY (news_id, author_id),
  KEY idx_news_authors_author (author_id),
  CONSTRAINT fk_news_authors_news FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE,
  CONSTRAINT fk_news_authors_author FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
