import { z } from "zod"; 

export const createTeamMemberSchema = z.object({ 
    name: z.string().min(1, "Name is required"), 
    role: z.string().min(1, "Role is required"), 
    email: z.string().email("Must be a valid email").optional(), 
}); 

export const updateTeamMemberSchema = createTeamMemberSchema.partial();