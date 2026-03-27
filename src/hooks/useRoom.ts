import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./useSessionId";

export async function createRoom(roomCode: string): Promise<string> {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ room_code: roomCode, host_session_id: getSessionId() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function findRoom(roomCode: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function joinRoomDb(roomId: string, playerName: string, teamId: string) {
  const { error } = await supabase
    .from("room_members")
    .insert({
      room_id: roomId,
      session_id: getSessionId(),
      player_name: playerName,
      team_id: teamId,
    });
  if (error) throw error;
}

export async function getRoomMembers(roomId: string) {
  const { data } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", roomId);
  return data || [];
}

export async function leaveRoomDb(roomId: string, teamId: string) {
  await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("team_id", teamId);
}

export function subscribeToRoomMembers(
  roomId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel(`room-members-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_members",
        filter: `room_id=eq.${roomId}`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
