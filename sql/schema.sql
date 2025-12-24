-- Create map_pins table - Production ready with organization support!
CREATE TABLE IF NOT EXISTS map_pins (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  type VARCHAR(50) DEFAULT 'story',
  category VARCHAR(100) DEFAULT 'general',
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample pins
INSERT INTO map_pins (id, title, lat, lng, type, category, country, city) VALUES
('sample_1', 'Healthcare Access Story', 40.7128, -74.006, 'story', 'healthcare', 'United States', 'New York'),
('sample_2', 'Workplace Rights Campaign', 51.5074, -0.1278, 'story', 'workplace', 'United Kingdom', 'London'),
('sample_3', 'Education Equality Initiative', 48.8566, 2.3522, 'story', 'education', 'France', 'Paris')
ON CONFLICT (id) DO NOTHING;

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  email VARCHAR(255),
  anonymous BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
