import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Defense, Project, Team } from '../types';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ShieldCheck, Users, Search, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

export default function StudentView() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<{
    team: Team;
    projects: Project[];
    defenses: Defense[];
  } | null>(null);

  const handleLookup = async () => {
    if (!/^\d{6}$/.test(accessCode)) {
      toast.error('Please enter a valid 6-digit team ID.');
      return;
    }

    setLoading(true);
    setRecord(null);
    try {
      const data = await api.student.lookupTeamByAccessCode(accessCode);
      setRecord(data);
    } catch {
      toast.error('No team record found for that 6-digit ID.');
    } finally {
      setLoading(false);
    }
  };

  const projectTitle = record?.projects?.length
    ? (record.projects.find((p) => p.status === 'In Progress') || record.projects[0]).project_title
    : 'No project title yet';

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-primary text-primary-foreground py-12 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-16 w-16" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Team Defense Record Lookup</h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Enter your team's 6-digit unique ID to view adviser, proponents, defense status, and panel details.
          </p>
          <div className="pt-6 max-w-md mx-auto space-y-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter 6-digit team ID" 
                  className="pl-10 bg-white text-black h-12 text-lg shadow-xl border-0 ring-offset-primary" 
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                />
             </div>
             <Button type="button" onClick={handleLookup} className="w-full h-11 text-base">
               View Team Record
             </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse">Loading team record...</div>
        ) : !record ? (
          <div className="text-center py-20 text-muted-foreground bg-white rounded-xl shadow-sm border">
             <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
             <p>Enter your 6-digit team ID above to view your defense record.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{record.team.team_name}</h2>
                  <p className="text-sm text-muted-foreground">Project Title: {projectTitle}</p>
                </div>
                <Badge variant="outline">ID: {record.team.access_code || accessCode}</Badge>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Proponents</p>
                <div className="flex flex-wrap gap-2">
                  {record.team.proponents?.map((name, i) => (
                    <Badge key={i} variant="secondary">{name}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Adviser</p>
                  <p className="text-sm font-medium">{record.team.adviser || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Program / Class</p>
                  <p className="text-sm font-medium">{record.team.program} / {record.team.class}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              {record.defenses.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">No defenses scheduled yet.</Card>
              ) : (
                record.defenses.map((d: Defense) => (
                  <Card key={d.id} className="p-6 space-y-4">
                    <h3 className="text-xl font-bold tracking-tight">Defense Records</h3>
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <Badge variant="outline" className="mb-2 uppercase tracking-tighter text-[10px]">{d.defense_type}</Badge>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(d.defense_date), 'PPPP')} at {d.defense_time}
                        </p>
                      </div>
                      <Badge variant={d.status === 'Completed' ? 'default' : 'outline'}>{d.status}</Badge>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        <Users className="h-3 w-3" /> Panel Members
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {d.panelists.map((panelist, idx) => (
                          <Badge key={idx} variant="secondary">{panelist}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t text-center text-sm text-muted-foreground">
        <Link to="/login" className="hover:text-primary transition-colors">Admin Portal Login</Link>
      </footer>
    </div>
  );
}
