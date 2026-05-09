import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Consultation, Team } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export default function Consultations() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<(Consultation & { team?: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const cData = await api.consultations.list();
        const teamsData = await api.teams.list();
        const teamMap = new Map(teamsData.map((t: Team) => [t.id, t]));
        
        const data = cData.map((c) => ({
          ...c,
          team: teamMap.get(c.teamId)
        }));
        setConsultations(data as any);
      } catch (err) {
        toast.error("Failed to load consultations");
      } finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, []);

  const filteredConsultations = consultations.filter(c => 
    c.team?.team_name.toLowerCase().includes(search.toLowerCase()) ||
    c.issues.toLowerCase().includes(search.toLowerCase()) ||
    c.recommendations.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Consultations</h2>
          <p className="text-muted-foreground italic text-sm">Full history of all consultation records.</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search teams, issues..." 
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
                <TableHead>Team</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Issues Discussed</TableHead>
                <TableHead>Recommendations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">Loading consultations...</TableCell>
                </TableRow>
              ) : filteredConsultations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No consultation records found.</TableCell>
                </TableRow>
              ) : (
                filteredConsultations.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/consultations/${c.id}`)}
                  >
                    <TableCell className="font-semibold">{c.team?.team_name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(c.createdAt), 'PP p')}</TableCell>
                    <TableCell className="max-w-sm truncate">{c.issues}</TableCell>
                    <TableCell className="max-w-sm truncate">{c.recommendations}</TableCell>
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
