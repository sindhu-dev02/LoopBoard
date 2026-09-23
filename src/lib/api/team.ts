import { TeamMember } from "@/types";
import { api } from "@/lib/api";

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return api.get<TeamMember[]>("/api/team");
}

export async function createTeamMember(data: {
  name: string;
  role: string;
  email?: string;
}): Promise<TeamMember> {
  return api.post<TeamMember>("/api/team", data);
}

export async function updateTeamMember(
  id: string,
  data: Partial<{ name: string; role: string; email: string }>
): Promise<TeamMember> {
  return api.patch<TeamMember>(`/api/team/${id}`, data);
}