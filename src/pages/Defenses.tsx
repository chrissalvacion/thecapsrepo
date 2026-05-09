import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Defense, Team } from '../types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Edit, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function Defenses() {
  const navigate = useNavigate();
  const [defenses, setDefenses] = useState<(Defense & { team?: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Defense | null>(null);
  const [search, setSearch] = useState('');

  const fetchDefenses = async () => {
    try {
      const dData = await api.defenses.list();
      const teamsData = await api.teams.list();
      const teamMap = new Map(teamsData.map((t: Team) => [t.id, t]));
      
      const data = dData.map((d: Defense) => ({
        ...d,
        team: teamMap.get(d.teamId)
      }));
      setDefenses(data);
    } catch (err) {
      toast.error("Failed to load defenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefenses();
  }, []);

  const filteredDefenses = defenses.filter(d => 
    d.defense_type.toLowerCase().includes(search.toLowerCase()) ||
    d.team?.team_name.toLowerCase().includes(search.toLowerCase()) ||
    d.panelists.some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUpdateDefense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const formData = new FormData(e.currentTarget);
    try {
      await api.defenses.update(editing.id, {
        recommendations: formData.get('recommendations'),
        suggestions: formData.get('suggestions'),
        status: formData.get('status'),
      });
      toast.success("Defense results updated!");
      setEditing(null);
      fetchDefenses();
    } catch (err) { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold tracking-tight">Defenses</h2>
          <p className="text-muted-foreground italic text-sm">Schedule and record outcomes of capstone defenses.</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search team, type, or panelist..." 
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
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : filteredDefenses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No defenses found.</TableCell></TableRow>
              ) : (
                filteredDefenses.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/defenses/${d.id}`)}>
                    <TableCell className="font-bold">{d.team?.team_name || 'N/A'}</TableCell>
                    <TableCell>{d.defense_type}</TableCell>
                    <TableCell>
                      <div className="text-xs">{format(new Date(d.defense_date), 'PPP')}</div>
                      <div className="text-xs text-muted-foreground">{d.defense_time}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'Completed' ? 'default' : 'outline'}>{d.status}</Badge>
                      {d.recommendations && <Badge variant="secondary" className="ml-2">{d.recommendations}</Badge>}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                       <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
                         <Edit className="h-4 w-4 mr-1" /> Edit Result
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Update Defense Results</DialogTitle>
           </DialogHeader>
           {editing && (
             <form onSubmit={handleUpdateDefense} className="space-y-4 py-4">
                <div className="space-y-2">
                   <Label>Status</Label>
                   <Select name="status" defaultValue={editing.status}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="Scheduled">Scheduled</SelectItem>
                         <SelectItem value="Completed">Completed</SelectItem>
                         <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>Recommendations</Label>
                   <Select name="recommendations" defaultValue={editing.recommendations}>
                      <SelectTrigger><SelectValue placeholder="Select verdict" /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="accept with revisions">Accept with Revisions</SelectItem>
                         <SelectItem value="re-defense">Re-defense</SelectItem>
                         <SelectItem value="not accepted">Not Accepted</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>Suggestions</Label>
                   <Textarea name="suggestions" defaultValue={editing.suggestions} />
                </div>
                <DialogFooter>
                   <Button type="submit">Save Changes</Button>
                </DialogFooter>
             </form>
           )}
         </DialogContent>
      </Dialog>
    </div>
  );
}
