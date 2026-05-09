import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Consultation, Project, Team } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ConsultationDetail() {
  const { consultationId } = useParams();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newRecommendation, setNewRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!consultationId) return;
      try {
        const cData = await api.consultations.get(consultationId);
        setConsultation(cData);

        const [teamData, projectData] = await Promise.all([
          api.teams.get(cData.teamId),
          api.projects.list(cData.teamId),
        ]);

        setTeam(teamData);
        setProjects(projectData);
      } catch {
        toast.error('Failed to load consultation details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [consultationId]);

  const projectTitle = useMemo(() => {
    if (!projects.length) return 'No project title available';
    const inProgress = projects.find((p) => p.status === 'In Progress');
    return (inProgress || projects[0]).project_title;
  }, [projects]);

  const handleAddRecommendation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consultation || !consultationId) return;

    const trimmed = newRecommendation.trim();
    if (!trimmed) {
      toast.error('Please enter a recommendation.');
      return;
    }

    setSaving(true);
    const stampedRecommendation = `[${format(new Date(), 'PPpp')}] ${trimmed}`;
    const mergedRecommendation = consultation.recommendations
      ? `${consultation.recommendations}\n\n${stampedRecommendation}`
      : stampedRecommendation;

    try {
      await api.consultations.update(consultationId, { recommendations: mergedRecommendation });
      setConsultation({ ...consultation, recommendations: mergedRecommendation });
      setNewRecommendation('');
      toast.success('Recommendation added.');
    } catch {
      toast.error('Failed to add recommendation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading consultation details...</div>;
  if (!consultation) return <div className="p-8 text-center">Consultation not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link to="/consultations" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Consultations
      </Link>

      <div className="border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Consultation Detail</h1>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Name</p>
            <p className="text-sm font-medium mt-1">{team?.team_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Title</p>
            <p className="text-sm font-medium mt-1">{projectTitle}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proponents</p>
            <p className="text-sm font-medium mt-1">{team?.proponents?.join(', ') || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
            <p className="text-sm font-medium mt-1">{format(new Date(consultation.createdAt), 'PPPP p')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issues Discussed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{consultation.issues}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{consultation.recommendations || 'No recommendations yet.'}</p>

          <form onSubmit={handleAddRecommendation} className="space-y-3">
            <Textarea
              placeholder="Add a new recommendation..."
              value={newRecommendation}
              onChange={(e) => setNewRecommendation(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add Recommendation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
