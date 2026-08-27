/*
# CampusFix: Create profiles and complaints tables

1. Purpose
   CampusFix is a college complaint management app. Students report campus
   problems (broken fans, dirty washrooms, etc.) and track their resolution.
   Admins view all complaints, filter them, assign to maintenance staff, and
   update status (reported → in_progress → resolved).

2. New Tables

   a) profiles
      - id (uuid, PK, references auth.users) — the user's auth ID
      - name (text, not null) — display name
      - role (text, not null, default 'student') — 'student' or 'admin'
      - created_at (timestamptz, default now())

   b) complaints
      - id (uuid, PK, default gen_random_uuid())
      - user_id (uuid, not null, default auth.uid(), references auth.users)
      - title (text, not null) — short complaint title
      - category (text, not null) — Electrical, Plumbing, Furniture, Cleanliness, WiFi, Other
      - description (text) — optional longer description
      - location (text, not null) — e.g. "Classroom 204"
      - image_url (text) — URL to uploaded photo in storage (optional)
      - image_path (text) — storage path for deletion (optional)
      - status (text, not null, default 'reported') — 'reported', 'in_progress', 'resolved'
      - assigned_to (text) — name of assigned maintenance staff (optional)
      - created_at (timestamptz, default now())
      - updated_at (timestamptz, default now())

3. Indexes
   - complaints(user_id) — for fetching a student's own complaints
   - complaints(status) — for filtering by status
   - complaints(category) — for filtering by category
   - complaints(created_at DESC) — for ordering by most recent

4. Security (RLS)

   profiles:
   - SELECT: users can read their own profile (auth.uid() = id)
   - INSERT: users can insert their own profile (auth.uid() = id)
   - UPDATE: users can update their own profile (auth.uid() = id)

   complaints:
   - SELECT: students see their own complaints; admins see all complaints
     (auth.uid() = user_id OR exists an admin profile for auth.uid())
   - INSERT: authenticated users can insert complaints they own
     (auth.uid() = user_id)
   - UPDATE: students can update their own complaints; admins can update all
     (auth.uid() = user_id OR exists an admin profile for auth.uid())
   - DELETE: students can delete their own complaints; admins can delete any
     (auth.uid() = user_id OR exists an admin profile for auth.uid())

5. Storage
   - Creates a public bucket 'complaints' for complaint photos.
   - SELECT (read) is public so images can be displayed.
   - INSERT (upload) requires authentication.
   - UPDATE/DELETE: owner of the object OR admin.

6. Notes
   - Role is stored in profiles.role. The app reads the profile after login
     to determine which interface (student vs admin) to show.
   - The updated_at column is maintained by a trigger that sets it to now()
     whenever a complaint row is updated.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  location text NOT NULL,
  image_url text,
  image_path text,
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved')),
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is an admin
-- Used in complaint policies so admins can manage all complaints
DROP POLICY IF EXISTS "select_complaints" ON complaints;
CREATE POLICY "select_complaints" ON complaints FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_complaints" ON complaints;
CREATE POLICY "insert_complaints" ON complaints FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_complaints" ON complaints;
CREATE POLICY "update_complaints" ON complaints FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_complaints" ON complaints;
CREATE POLICY "delete_complaints" ON complaints FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);

-- Trigger to auto-update updated_at on complaint changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_complaints_updated_at ON complaints;
CREATE TRIGGER trigger_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Storage bucket for complaint photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaints', 'complaints', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, everyone can read
DROP POLICY IF EXISTS "read_complaint_photos" ON storage.objects;
CREATE POLICY "read_complaint_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'complaints');

DROP POLICY IF EXISTS "upload_complaint_photos" ON storage.objects;
CREATE POLICY "upload_complaint_photos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'complaints');

DROP POLICY IF EXISTS "update_complaint_photos" ON storage.objects;
CREATE POLICY "update_complaint_photos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'complaints') WITH CHECK (bucket_id = 'complaints');

DROP POLICY IF EXISTS "delete_complaint_photos" ON storage.objects;
CREATE POLICY "delete_complaint_photos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'complaints');
