import { api } from "@/lib/api";
import { Comment } from "@/types";

export async function fetchComments(taskId: string): Promise<Comment[]> {
  return api.get<Comment[]>(`/api/tasks/${taskId}/comments`);
}

export async function postComment(taskId: string, body: string): Promise<Comment> {
  return api.post<Comment>(`/api/tasks/${taskId}/comments`, { body });
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  return api.delete<void>(`/api/tasks/${taskId}/comments/${commentId}`);
}