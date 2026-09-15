"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import { TeamMember } from "@/types";
import { fetchTeamMembers } from "@/lib/api/team";

function TeamMemberCardSkeleton() {
  return (
    <Card className="flex items-center gap-3 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <Avatar name={member.name} />
      <div>
        <p className="text-sm font-medium text-ink">{member.name}</p>
        <p className="text-xs text-ink-muted">{member.role}</p>
        <p className="text-xs text-ink-muted font-mono">ID: {member.id}</p>
      </div>
    </Card>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);

  useEffect(() => {
    fetchTeamMembers().then(setMembers);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Team</h1>
        <p className="text-sm text-ink-muted mt-1">Everyone currently working across projects</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {members === null
          ? Array.from({ length: 4 }).map((_, i) => <TeamMemberCardSkeleton key={i} />)
          : members.length > 0
          ? members.map((m) => <TeamMemberCard key={m.id} member={m} />)
          : (
            <div className="col-span-full">
              <EmptyState
                icon={Users}
                title="No team members found"
                description="There's no one on the team yet."
              />
            </div>
          )}
      </div>
    </div>
  );
}