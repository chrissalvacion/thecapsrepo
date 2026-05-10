import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Team, Project, Defense, Consultation, Panelist } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  FolderKanban, 
  ShieldCheck, 
  MessageSquare, 
  Calendar as CalendarIcon,
  ChevronLeft
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [allPanelists, setAllPanelists] = useState<Panelist[]>([]);
  const [selectedPanelists, setSelectedPanelists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editProponents, setEditProponents] = useState<string[]>([]);
  const [editProponentInput, setEditProponentInput] = useState('');

  const fetchData = async () => {
    if (!teamId) return;
    try {
      const [teamData, projectsData, defensesData, consultationsData, panelistsData] = await Promise.all([
        api.teams.get(teamId),
        api.projects.list(teamId),
        api.defenses.list(teamId),
        api.consultations.list(teamId),
        api.panelists.list()
      ]);
      setTeam(teamData);
      setProjects(projectsData);
      setDefenses(defensesData);
      setConsultations(consultationsData);
      setAllPanelists(panelistsData);
    } catch (err) {
      toast.error("Error loading team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamId]);

  // Form Handlers
  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     const form = e.currentTarget;
     const formData = new FormData(form);
    try {
      await api.projects.create({
        teamId,
        project_title: formData.get('title'),
        school_year: formData.get('school_year'),
        description: formData.get('description'),
        objectives: formData.get('objectives'),
        status: 'In Progress',
      });
      toast.success("Project added");
       form.reset();
      setShowProjectModal(false);
      fetchData();
    } catch (err) { toast.error("Error adding project"); }
  };

  const handleAddConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     const form = e.currentTarget;
     const formData = new FormData(form);
    try {
      await api.consultations.create({
        teamId,
        issues: formData.get('issues'),
        recommendations: formData.get('recommendations'),
      });
      toast.success("Consultation recorded");
       form.reset();
      fetchData();
    } catch (err) { toast.error("Error recording consultation"); }
  };

  const handleAddDefense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date')?.toString() || '';
    const time = formData.get('time')?.toString() || '';
    const type = formData.get('type')?.toString() || '';

    if (selectedPanelists.length === 0) {
      toast.error("Please select at least one panelist");
      return;
    }

     const form = e.currentTarget;
    try {
      await api.defenses.create({
        teamId,
        defense_type: type,
        defense_date: date,
        defense_time: time,
        panelists: selectedPanelists,
        recommendations: '',
        suggestions: '',
      });

      toast.success("Defense scheduled");
      setSelectedPanelists([]);
       form.reset();
      setShowDefenseModal(false);
      fetchData();
    } catch (err) { toast.error("Error scheduling defense"); }
  };

  const handleEditTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teamId) return;
    const formData = new FormData(e.currentTarget);
    try {
      await api.teams.update(teamId, {
        team_name: formData.get('team_name'),
        proponents: editProponents,
        program: formData.get('program'),
        class: formData.get('class'),
        email: formData.get('email'),
        contact_num: formData.get('contact_num'),
        adviser: formData.get('adviser'),
      });
      toast.success('Team updated');
      setShowEditTeamModal(false);
      fetchData();
    } catch { toast.error('Failed to update team'); }
  };

  const addEditProponent = () => {
    const val = editProponentInput.trim();
    if (val && !editProponents.includes(val)) {
      setEditProponents([...editProponents, val]);
      setEditProponentInput('');
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    const confirmed = window.confirm('Delete this team? All associated projects, defenses, and consultations will also be deleted. This cannot be undone.');
    if (!confirmed) return;
    try {
      await api.teams.delete(teamId);
      toast.success('Team deleted');
      navigate('/teams');
    } catch { toast.error('Failed to delete team'); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!team) return <div className="p-8 text-center">Team not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link to="/teams" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Teams
      </Link>

      <div className="border-b pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{team.team_name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{team.program}</Badge>
            <Badge variant="outline">{team.class}</Badge>
            <Badge variant="default">Access Code: {team.access_code || 'N/A'}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => { setEditProponents(team.proponents || []); setShowEditTeamModal(true); }}>Edit Team</Button>
          <Button variant="destructive" onClick={handleDeleteTeam}>Delete Team</Button>
        </div>
      </div>

      {/* Edit Team Modal */}
      <Dialog open={showEditTeamModal} onOpenChange={setShowEditTeamModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Team Name</Label>
              <Input name="team_name" defaultValue={team.team_name} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Proponents</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editProponents.map((name, i) => (
                  <Badge key={i} variant="secondary" className="pl-2 gap-1 py-1">
                    {name}
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditProponents(editProponents.filter((_, idx) => idx !== i))} className="h-5 w-5 hover:text-destructive">×</Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add proponent name and press Enter"
                  value={editProponentInput}
                  onChange={(e) => setEditProponentInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEditProponent();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addEditProponent}>Add</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Input name="program" list="program-options" defaultValue={team.program || 'BS Computer Science'} required />
              <datalist id="program-options">
                <option value="BS Computer Science" />
                <option value="BS Information Systems" />
                <option value="BS Information Technology" />
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Class / Section</Label>
              <Input name="class" defaultValue={team.class} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={team.email}/>
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input name="contact_num" defaultValue={team.contact_num}/>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Adviser</Label>
              <Input name="adviser" defaultValue={team.adviser} required />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditTeamModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Proponents</p>
            <ul className="space-y-0.5">
              {team.proponents.map((name, i) => (
                <li key={i} className="text-sm font-medium">{name}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-medium break-all">{team.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
            <p className="text-sm font-medium">{team.contact_num}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Adviser</p>
            <p className="text-sm font-medium">{team.adviser}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" /> Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="defenses" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Defenses ({defenses.length})
          </TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Consultations ({consultations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowProjectModal(true)}>+ Add New Project</Button>
          </div>
          <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Project Title</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea name="description" className="h-32 overflow-y-auto resize-none" />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>School Year</Label>
                  <Input name="school_year" placeholder="e.g. 2025-2026" required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Objectives</Label>
                  <Textarea name="objectives" className="h-32 overflow-y-auto resize-none" />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowProjectModal(false)}>Cancel</Button>
                  <Button type="submit">Add Project</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <div className="grid gap-4">
            {projects.map(p => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold">{p.project_title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {p.school_year ? <Badge variant="outline">SY {p.school_year}</Badge> : null}
                      <Badge>{p.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                   <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
                   <div className="pt-2">
                     <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objectives</p>
                     <p className="text-sm italic">{p.objectives}</p>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="defenses" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowDefenseModal(true)}>+ Schedule Defense</Button>
          </div>
          <Dialog open={showDefenseModal} onOpenChange={(open) => { setShowDefenseModal(open); if (!open) setSelectedPanelists([]); }}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Schedule Defense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDefense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Defense Type</Label>
                  <select
                    name="type"
                    required
                    defaultValue=""
                    className="flex h-8 w-50 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                  >
                    <option value="" disabled>Select defense type</option>
                    <option value="Title Defense">Title Defense</option>
                    <option value="Pre-Oral Defense">Pre-Oral Defense</option>
                    <option value="Final Defense">Final Defense</option>
                  </select>
                </div>
                <div className="space-y-4 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Select Panelists</Label>
                    <span className="text-xs text-muted-foreground">{selectedPanelists.length} selected</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPanelists.map(name => (
                      <Badge key={name} variant="secondary" className="pl-2 gap-1 py-1">
                        {name}
                        <button 
                          type="button" 
                          onClick={() => setSelectedPanelists(selectedPanelists.filter(n => n !== name))}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {selectedPanelists.length === 0 && (
                      <span className="text-sm text-muted-foreground italic">No panelists selected yet</span>
                    )}
                  </div>

                  <Select onValueChange={(val) => {
                    if (!selectedPanelists.includes(val)) {
                      setSelectedPanelists([...selectedPanelists, val]);
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Add a panelist from the pool..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allPanelists.map(p => (
                        <SelectItem key={p.id} value={p.name} disabled={selectedPanelists.includes(p.name)}>
                          {p.name} ({p.designation})
                        </SelectItem>
                      ))}
                      {allPanelists.length === 0 && (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No panelists found. Register them in the Panelists menu.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input name="date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input name="time" type="time" required />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowDefenseModal(false); setSelectedPanelists([]); }}>Cancel</Button>
                  <Button type="submit">Schedule Defense</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4">
            {defenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No defenses scheduled yet.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Panelists</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defenses.map(d => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/teams/${teamId}/defenses/${d.id}`)}
                      >
                        <TableCell className="font-medium">{d.defense_type}</TableCell>
                        <TableCell>{format(new Date(d.defense_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{d.defense_time}</TableCell>
                        <TableCell>{d.panelists.join(', ')}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'Completed' ? 'default' : 'outline'}>{d.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-6">
          <div className="space-y-4">
            {consultations.map(c => (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/consultations/${c.id}`)}
              >
                <CardContent className="p-5 flex gap-4">
                  <div className="flex-none pt-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {format(new Date(c.createdAt), 'MMM d')}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">{format(new Date(c.createdAt), 'PPPP')}</span>
                    </div>
                    <div>
                       <p className="text-xs font-bold uppercase text-muted-foreground">Issues</p>
                       <p className="text-sm whitespace-pre-wrap">{c.issues}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold uppercase text-muted-foreground">Recommendations</p>
                       <p className="text-sm italic text-primary">{c.recommendations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

           <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddConsultation} className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Issues Discussed</Label>
                  <Textarea name="issues" required />
                </div>
                <div className="space-y-2">
                  <Label>Recommendations / Next Steps</Label>
                  <Textarea name="recommendations" required />
                </div>
                <Button type="submit" className="w-fit">Save Record</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
