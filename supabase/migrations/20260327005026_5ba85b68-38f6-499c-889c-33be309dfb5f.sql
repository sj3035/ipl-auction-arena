
-- Create rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_session_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'lobby',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create room_members table
CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, team_id),
  UNIQUE(room_id, session_id)
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Permissive policies (game doesn't require auth)
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read room_members" ON public.room_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can join rooms" ON public.room_members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can leave rooms" ON public.room_members FOR DELETE TO anon, authenticated USING (true);

-- Enable realtime for room_members (live lobby updates)
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
