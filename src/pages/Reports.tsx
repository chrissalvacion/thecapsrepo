import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { Defense, Project, Team } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [loading, setLoading] = useState(true);

  const [programFilter, setProgramFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [defenseStatusFilter, setDefenseStatusFilter] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsData, projectsData, defensesData] = await Promise.all([
          api.teams.list(),
          api.projects.list(),
          api.defenses.list(),
        ]);
        setTeams(teamsData);
        setProjects(projectsData);
        setDefenses(defensesData);
      } catch {
        toast.error('Failed to load reports data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const latestDefenseStatusByTeam = useMemo(() => {
    const map = new Map<string, string>();
    const grouped = new Map<string, Defense[]>();

    defenses.forEach((d) => {
      if (!grouped.has(d.teamId)) grouped.set(d.teamId, []);
      grouped.get(d.teamId)!.push(d);
    });

    grouped.forEach((list, teamId) => {
      const latest = [...list].sort((a, b) => {
        const aTime = new Date(`${a.defense_date} ${a.defense_time || '00:00:00'}`).getTime();
        const bTime = new Date(`${b.defense_date} ${b.defense_time || '00:00:00'}`).getTime();
        return bTime - aTime;
      })[0];
      map.set(teamId, latest?.status || 'No Defense');
    });

    return map;
  }, [defenses]);

  const programOptions = useMemo(() => {
    return Array.from(new Set(teams.map((t) => t.program).filter(Boolean))).sort();
  }, [teams]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(teams.map((t) => t.class).filter(Boolean))).sort();
  }, [teams]);

  const schoolYearOptions = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.school_year).filter(Boolean) as string[])).sort();
  }, [projects]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const status = latestDefenseStatusByTeam.get(team.id) || 'No Defense';
      const matchesProgram = programFilter === 'all' || team.program === programFilter;
      const matchesClass = classFilter === 'all' || team.class === classFilter;
      const matchesStatus = defenseStatusFilter === 'all' || status === defenseStatusFilter;
      const matchesSearch =
        team.team_name.toLowerCase().includes(search.toLowerCase()) ||
        team.proponents.some((p) => p.toLowerCase().includes(search.toLowerCase()));

      return matchesProgram && matchesClass && matchesStatus && matchesSearch;
    });
  }, [teams, latestDefenseStatusByTeam, programFilter, classFilter, defenseStatusFilter, search]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSchoolYear = schoolYearFilter === 'all' || project.school_year === schoolYearFilter;
      return matchesSchoolYear;
    });
  }, [projects, schoolYearFilter]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const exportProjects = useMemo(() => {
    const filteredTeamIds = new Set(filteredTeams.map((team) => team.id));
    return filteredProjects.filter((project) => filteredTeamIds.has(project.teamId));
  }, [filteredProjects, filteredTeams]);

  const projectsBySchoolYear = useMemo(() => {
    const grouped = new Map<string, (Project & { team?: Team })[]>();

    filteredProjects.forEach((project) => {
      const key = project.school_year || 'Unspecified';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ ...project, team: teamMap.get(project.teamId) });
    });

    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredProjects, teamMap]);

  const handleExportExcel = () => {
    if (exportProjects.length === 0) {
      toast.error('No records to export for the current filters.');
      return;
    }

    const rows = exportProjects.map((project) => {
      const team = teamMap.get(project.teamId);
      return {
        'Project Title': project.project_title,
        'Team Name': team?.team_name || 'Unknown Team',
        'Proponents': team?.proponents?.join(', ') || '',
        'Adviser': team?.adviser || '',
        'School Year': project.school_year || 'Unspecified',
        'Status': project.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `capsrepo-reports-${date}.xlsx`);
    toast.success('Excel file exported successfully.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground italic text-sm">Generate team and project reports by filters.</p>
        </div>
        <div className="flex items-center gap-2 w-full max-w-xl justify-end">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team or proponent..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handleExportExcel}>Export Excel</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programOptions.map((program) => (
                <SelectItem key={program} value={program}>{program}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={defenseStatusFilter} onValueChange={setDefenseStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by defense status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Defense Statuses</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="No Defense">No Defense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter projects by school year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All School Years</SelectItem>
              {schoolYearOptions.map((sy) => (
                <SelectItem key={sy} value={sy}>{sy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Defense Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">Loading report data...</TableCell>
                </TableRow>
              ) : filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No teams matched your filters.</TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => {
                  const status = latestDefenseStatusByTeam.get(team.id) || 'No Defense';
                  return (
                    <TableRow key={team.id}>
                      <TableCell className="font-semibold">{team.team_name}</TableCell>
                      <TableCell>{team.program}</TableCell>
                      <TableCell>{team.class}</TableCell>
                      <TableCell>
                        <Badge variant={status === 'Completed' ? 'default' : 'outline'}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight">Projects Per School Year</h3>
        {projectsBySchoolYear.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">No projects found for selected school year filter.</CardContent>
          </Card>
        ) : (
          projectsBySchoolYear.map(([schoolYear, list]) => (
            <Card key={schoolYear}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{schoolYear}</h4>
                  <Badge variant="secondary">{list.length} project(s)</Badge>
                </div>
                <div className="space-y-2">
                  {list.map((project) => (
                    <div key={project.id} className="text-sm border rounded-md px-3 py-2 flex items-center justify-between gap-2">
                      <span className="font-medium">{project.project_title}</span>
                      <span className="text-muted-foreground">{project.team?.team_name || 'Unknown Team'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div> */}
    </div>
  );
}
