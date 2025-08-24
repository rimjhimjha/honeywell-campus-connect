/*
  # NigraniAI Database Schema

  1. New Tables
    - `alerts` - Store safety alerts with acknowledgment tracking
    - `users` - User profiles with role-based access
    - `cameras` - Camera management and status tracking
    - `system_logs` - System event logging
    - `reports` - AI-generated report storage

  2. Security
    - Enable RLS on all tables
    - Role-based policies for data access
    - Secure user authentication integration

  3. Performance
    - Optimized indexes for common queries
    - Efficient timestamp-based sorting
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  timestamp timestamptz NOT NULL,
  frame_number integer DEFAULT 0,
  person_count integer DEFAULT 1,
  description text NOT NULL,
  location text DEFAULT 'Unknown Location',
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  acknowledged boolean DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Cameras table
CREATE TABLE IF NOT EXISTS cameras (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  location text NOT NULL,
  type text DEFAULT 'webcam' CHECK (type IN ('webcam', 'ip', 'rtsp')),
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  resolution text DEFAULT '1920x1080',
  fps integer DEFAULT 30,
  stream_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  level text NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR')),
  message text NOT NULL,
  module text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  type text NOT NULL,
  time_range text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  generated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies for alerts
CREATE POLICY "Users can view all alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for users
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for cameras
CREATE POLICY "Users can view cameras"
  ON cameras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cameras"
  ON cameras FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for system_logs
CREATE POLICY "Admins can view system logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "System can insert logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for reports
CREATE POLICY "Users can view their reports"
  ON reports FOR SELECT
  TO authenticated
  USING (generated_by = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_event_type ON alerts(event_type);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Insert default cameras (using WHERE NOT EXISTS to avoid conflicts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cameras WHERE name = 'Main Entrance') THEN
    INSERT INTO cameras (name, location, type, status, resolution, fps) VALUES
      ('Main Entrance', 'Building A', 'webcam', 'online', '1920x1080', 30);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM cameras WHERE name = 'Playground Area') THEN
    INSERT INTO cameras (name, location, type, status, resolution, fps) VALUES
      ('Playground Area', 'Outdoor Zone', 'ip', 'online', '1280x720', 24);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM cameras WHERE name = 'Parking Zone') THEN
    INSERT INTO cameras (name, location, type, status, resolution, fps) VALUES
      ('Parking Zone', 'Level 1', 'ip', 'online', '1920x1080', 30);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM cameras WHERE name = 'Cafeteria') THEN
    INSERT INTO cameras (name, location, type, status, resolution, fps) VALUES
      ('Cafeteria', 'Building B', 'webcam', 'offline', '1280x720', 24);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM cameras WHERE name = 'Emergency Exit') THEN
    INSERT INTO cameras (name, location, type, status, resolution, fps) VALUES
      ('Emergency Exit', 'Building A', 'webcam', 'online', '1920x1080', 30);
  END IF;
END $$;

-- Insert default users (using WHERE NOT EXISTS to avoid conflicts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    INSERT INTO users (username, email, role) VALUES
      ('admin', 'admin@nigraniai.com', 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'operator') THEN
    INSERT INTO users (username, email, role) VALUES
      ('operator', 'operator@nigraniai.com', 'operator');
  END IF;
END $$;

-- Insert initial system log
INSERT INTO system_logs (level, message, module) VALUES
  ('INFO', 'NigraniAI database schema initialized successfully', 'migration');