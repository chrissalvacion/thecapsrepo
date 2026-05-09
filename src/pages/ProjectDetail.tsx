import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Project, Team } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_STATUSES: Project['status'][] = ['In Progress', 'Completed', 'Archived'];

function normalizeProjectStatus(value: unknown): Project['status'] {
  if (typeof value === 'string' && PROJECT_STATUSES.includes(value as Project['status'])) {
    return value as Project['status'];
  }
  return 'In Progress';
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Project['status']>('In Progress');

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setLoading(false);
        toast.error('Invalid project URL');
        return;
      }
      try {
        const projectData = await api.projects.get(projectId);
        const safeProject: Project = {
          ...projectData,
          project_title: projectData.project_title || 'Untitled Project',
          description: projectData.description || '',
          objectives: projectData.objectives || '',
          school_year: projectData.school_year || '',
          status: normalizeProjectStatus(projectData.status),
        };

        setProject(safeProject);
        setStatus(safeProject.status);

        if (safeProject.teamId) {
          const teamData = await api.teams.get(safeProject.teamId);
          setTeam(teamData);
        }
      } catch {
        toast.error('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectId || !project) return;

    const formData = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api.projects.update(projectId, {
        project_title: (formData.get('project_title') as string) || '',
        school_year: (formData.get('school_year') as string) || '',
        description: (formData.get('description') as string) || '',
        objectives: (formData.get('objectives') as string) || '',
        status,
      });
      toast.success('Project updated');
      setProject((prev) => prev ? ({
        ...prev,
        project_title: formData.get('project_title') as string,
        school_year: formData.get('school_year') as string,
        description: formData.get('description') as string,
        objectives: formData.get('objectives') as string,
        status,
      }) : prev);
    } catch {
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId || !project) return;

    const shouldDelete = window.confirm('Delete this project? This cannot be undone.');
    if (!shouldDelete) return;

    try {
      await api.projects.delete(projectId);
      toast.success('Project deleted');
      navigate(project.teamId ? `/teams/${project.teamId}` : '/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link to="/projects" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Projects
      </Link>

      <div className="border-b pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{project.project_title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {project.school_year ? <Badge variant="outline">SY {project.school_year}</Badge> : null}
            <Badge>{project.status}</Badge>
            {team ? <Badge variant="secondary">{team.team_name}</Badge> : null}
          </div>
        </div>
        <Button variant="destructive" onClick={handleDeleteProject}>Delete Project</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Project Title</Label>
              <Input name="project_title" defaultValue={project.project_title} required />
            </div>
            <div className="space-y-2">
              <Label>School Year</Label>
              <Input name="school_year" defaultValue={project.school_year || ''} placeholder="e.g. 2025-2026" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as Project['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={project.description} rows={5} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Objectives</Label>
              <Textarea name="objectives" defaultValue={project.objectives} rows={5} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
