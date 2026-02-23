-- Seed File
-- Description: Sample data for the projects table.

-- Note: user_id should be replaced with a valid auth.users id in a real environment.
-- This is just a template for testing purposes.

INSERT INTO projects (name, user_id, data)
VALUES 
('My First Playground', '00000000-0000-0000-0000-000000000000', '{"objects": [{"type": "cube", "position": [0, 0, 0]}]}'),
('Sample 3D Scene', '00000000-0000-0000-0000-000000000000', '{"objects": [{"type": "sphere", "position": [2, 1, 0]}]}')
ON CONFLICT (id) DO NOTHING;
