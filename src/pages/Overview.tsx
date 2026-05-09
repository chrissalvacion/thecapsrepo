import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Consultation, Defense, Project, Team } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, CalendarClock, ClipboardList, FolderKanban, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

export default function Overview() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsData, projectsData, defensesData, consultationsData] = await Promise.all([
          api.teams.list(),
          api.projects.list(),
          api.defenses.list(),
          api.consultations.list(),
        ]);
        setTeams(teamsData);
        setProjects(projectsData);
        setDefenses(defensesData);
        setConsultations(consultationsData);
      } catch {
        toast.error('Failed to load overview data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const projectsByTeam = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((project) => {
      if (!map.has(project.teamId)) map.set(project.teamId, []);
      map.get(project.teamId)!.push(project);
    });
    return map;
  }, [projects]);

  const defensesByTeam = useMemo(() => {
    const map = new Map<string, Defense[]>();
    defenses.forEach((defense) => {
      if (!map.has(defense.teamId)) map.set(defense.teamId, []);
      map.get(defense.teamId)!.push(defense);
    });
    return map;
  }, [defenses]);

  const consultationsByTeam = useMemo(() => {
    const map = new Map<string, Consultation[]>();
    consultations.forEach((consultation) => {
      if (!map.has(consultation.teamId)) map.set(consultation.teamId, []);
      map.get(consultation.teamId)!.push(consultation);
    });
    return map;
  }, [consultations]);

  const upcomingDefenses = useMemo(() => {
    const now = Date.now();
    return [...defenses]
      .filter((defense) => {
        const dateTime = new Date(`${defense.defense_date} ${defense.defense_time || '00:00:00'}`).getTime();
        return dateTime >= now && defense.status !== 'Cancelled';
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.defense_date} ${a.defense_time || '00:00:00'}`).getTime();
        const bTime = new Date(`${b.defense_date} ${b.defense_time || '00:00:00'}`).getTime();
        return aTime - bTime;
      })
      .slice(0, 6);
  }, [defenses]);

  const recentTeams = useMemo(() => {
    return [...teams]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [teams]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [projects]);

  const latestConsultations = useMemo(() => {
    return [...consultations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [consultations]);

  const latestDefenseUpdates = useMemo(() => {
    return [...defenses]
      .filter((defense) => defense.status !== 'Scheduled' || !!defense.recommendations || !!defense.suggestions)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [defenses]);

  const teamsWithoutProjectTitle = useMemo(() => {
    return teams.filter((team) => {
      const teamProjects = projectsByTeam.get(team.id) || [];
      return teamProjects.length === 0 || teamProjects.every((project) => !project.project_title?.trim());
    });
  }, [teams, projectsByTeam]);

  const teamsWithoutSchoolYear = useMemo(() => {
    return teams.filter((team) => {
      const teamProjects = projectsByTeam.get(team.id) || [];
      return teamProjects.some((project) => !project.school_year?.trim());
    });
  }, [teams, projectsByTeam]);

  const teamsWithoutScheduledDefense = useMemo(() => {
    return teams.filter((team) => {
      const teamDefenses = defensesByTeam.get(team.id) || [];
      return teamDefenses.length === 0;
    });
  }, [teams, defensesByTeam]);

  const defensesWithNoPanelists = useMemo(() => {
    return defenses.filter((defense) => !defense.panelists || defense.panelists.length === 0);
  }, [defenses]);

  const consultationsMissingRecommendations = useMemo(() => {
    return consultations.filter((consultation) => !consultation.recommendations?.trim());
  }, [consultations]);

  const overdueTeams = useMemo(() => {
    const now = Date.now();
    const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;

    return teams.filter((team) => {
      const teamProjects = projectsByTeam.get(team.id) || [];
      const teamDefenses = defensesByTeam.get(team.id) || [];
      const teamConsultations = consultationsByTeam.get(team.id) || [];

      if (teamProjects.length === 0) return false;

      const latestProject = [...teamProjects].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const latestConsultation = [...teamConsultations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      const hasNoDefense = teamDefenses.length === 0;
      const projectIsOld = now - new Date(latestProject.createdAt).getTime() > fortyFiveDays;
      const consultationIsStale = !latestConsultation || now - new Date(latestConsultation.createdAt).getTime() > fortyFiveDays;

      return projectIsOld && hasNoDefense && consultationIsStale;
    });
  }, [teams, projectsByTeam, defensesByTeam, consultationsByTeam]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-lg border shadow-sm">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground italic text-sm">A quick snapshot of upcoming defenses, recent activity, and records needing attention.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Upcoming Defenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDefenses.length === 0 ? (
              <EmptyState message="No upcoming defenses scheduled." />
            ) : (
              upcomingDefenses.map((defense) => (
                <div key={defense.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{defense.defense_type}</p>
                      <p className="text-sm text-muted-foreground">{teamMap.get(defense.teamId)?.team_name || 'Unknown Team'}</p>
                    </div>
                    <Badge variant={defense.status === 'Completed' ? 'default' : 'outline'}>{defense.status}</Badge>
                  </div>
                  <p className="text-sm">{format(new Date(defense.defense_date), 'PPPP')} at {defense.defense_time}</p>
                  <p className="text-sm text-muted-foreground">Panelists: {defense.panelists.join(', ') || 'No panelists assigned'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold mb-2">Recently Added Teams</p>
              <div className="space-y-2">
                {recentTeams.length === 0 ? <EmptyState message="No teams yet." /> : recentTeams.map((team) => (
                  <div key={team.id} className="text-sm border rounded-md px-3 py-2">
                    <p className="font-medium">{team.team_name}</p>
                    <p className="text-muted-foreground">{format(new Date(team.createdAt), 'PP p')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Recently Added Projects</p>
              <div className="space-y-2">
                {recentProjects.length === 0 ? <EmptyState message="No projects yet." /> : recentProjects.map((project) => (
                  <div key={project.id} className="text-sm border rounded-md px-3 py-2">
                    <p className="font-medium">{project.project_title || 'Untitled Project'}</p>
                    <p className="text-muted-foreground">{teamMap.get(project.teamId)?.team_name || 'Unknown Team'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Latest Consultations</p>
              <div className="space-y-2">
                {latestConsultations.length === 0 ? <EmptyState message="No consultations yet." /> : latestConsultations.map((consultation) => (
                  <div key={consultation.id} className="text-sm border rounded-md px-3 py-2">
                    <p className="font-medium">{teamMap.get(consultation.teamId)?.team_name || 'Unknown Team'}</p>
                    <p className="text-muted-foreground line-clamp-2">{consultation.issues}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Latest Defense Updates</p>
              <div className="space-y-2">
                {latestDefenseUpdates.length === 0 ? <EmptyState message="No defense updates yet." /> : latestDefenseUpdates.map((defense) => (
                  <div key={defense.id} className="text-sm border rounded-md px-3 py-2">
                    <p className="font-medium">{teamMap.get(defense.teamId)?.team_name || 'Unknown Team'}</p>
                    <p className="text-muted-foreground">{defense.defense_type} - {defense.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Alerts / Attention Needed
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Teams without project title</p>
            {teamsWithoutProjectTitle.length === 0 ? <EmptyState message="None" /> : teamsWithoutProjectTitle.map((team) => (
              <p key={team.id} className="text-sm text-muted-foreground">{team.team_name}</p>
            ))}
          </div>

          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Teams without school year in project</p>
            {teamsWithoutSchoolYear.length === 0 ? <EmptyState message="None" /> : teamsWithoutSchoolYear.map((team) => (
              <p key={team.id} className="text-sm text-muted-foreground">{team.team_name}</p>
            ))}
          </div>

          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Teams without scheduled defense</p>
            {teamsWithoutScheduledDefense.length === 0 ? <EmptyState message="None" /> : teamsWithoutScheduledDefense.map((team) => (
              <p key={team.id} className="text-sm text-muted-foreground">{team.team_name}</p>
            ))}
          </div>

          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Defenses with no panelists</p>
            {defensesWithNoPanelists.length === 0 ? <EmptyState message="None" /> : defensesWithNoPanelists.map((defense) => (
              <p key={defense.id} className="text-sm text-muted-foreground">{teamMap.get(defense.teamId)?.team_name || 'Unknown Team'} - {defense.defense_type}</p>
            ))}
          </div>

          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Consultations missing recommendations</p>
            {consultationsMissingRecommendations.length === 0 ? <EmptyState message="None" /> : consultationsMissingRecommendations.map((consultation) => (
              <p key={consultation.id} className="text-sm text-muted-foreground">{teamMap.get(consultation.teamId)?.team_name || 'Unknown Team'}</p>
            ))}
          </div>

          <div className="border rounded-md p-4">
            <p className="font-semibold mb-2">Teams with overdue progress</p>
            {overdueTeams.length === 0 ? <EmptyState message="None" /> : overdueTeams.map((team) => (
              <p key={team.id} className="text-sm text-muted-foreground">{team.team_name}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Teams</p>
              <p className="text-2xl font-bold">{teams.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Projects</p>
              <p className="text-2xl font-bold">{projects.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Defenses</p>
              <p className="text-2xl font-bold">{defenses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Consultations</p>
              <p className="text-2xl font-bold">{consultations.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
