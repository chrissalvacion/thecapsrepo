import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Project, Team } from '../types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Projects() {
  const [projects, setProjects] = useState<(Project & { team?: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const pData = await api.projects.list();
        const teamsData = await api.teams.list();
        const teamMap = new Map(teamsData.map((t: Team) => [t.id, t]));
        
        const data = pData.map((p: Project) => ({
          ...p,
          team: teamMap.get(p.teamId)
        }));
        setProjects(data);
      } catch (err) {
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.project_title.toLowerCase().includes(search.toLowerCase()) ||
    p.team?.team_name.toLowerCase().includes(search.toLowerCase()) ||
    p.status.toLowerCase().includes(search.toLowerCase()) ||
    (p.school_year || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Projects</h2>
          <p className="text-muted-foreground italic text-sm">A centralized list of all registered capstone projects.</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects or teams..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Title</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>School Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No projects found.</TableCell></TableRow>
              ) : (
                filteredProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">
                      <Link to={`/projects/${p.id}`} className="text-primary hover:underline">
                        {p.project_title}
                      </Link>
                    </TableCell>
                    <TableCell>{p.team?.team_name || 'N/A'}</TableCell>
                    <TableCell>{p.school_year || 'N/A'}</TableCell>
                    <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link to={`/teams/${p.teamId}`} className="text-primary hover:underline text-sm inline-flex items-center gap-1">
                        Go to Team <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
