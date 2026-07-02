-- Tabla única para el portfolio completo
CREATE TABLE IF NOT EXISTS portfolio (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar registro inicial vacío
INSERT INTO portfolio (id, data) VALUES ('main', '{}')
ON CONFLICT (id) DO NOTHING;
