import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Panelist } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { UserCheck, Plus, Trash2, Mail, Phone, Briefcase, Award, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function Panelists() {
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Panelist | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');

  const fetchPanelists = async () => {
    try {
      const data = await api.panelists.list();
      setPanelists(data);
    } catch (err) {
      toast.error("Failed to load panelists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanelists();
  }, []);

  const filteredPanelists = panelists.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.designation.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPanelist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.panelists.update(editing.id, {
          name,
          designation,
          position,
          email,
          contact
        });
        toast.success("Panelist updated successfully!");
      } else {
        await api.panelists.create({
          name,
          designation,
          position,
          email,
          contact
        });
        toast.success("Panelist added successfully!");
      }
      setOpen(false);
      resetForm();
      fetchPanelists();
    } catch (error) {
      toast.error(editing ? "Failed to update panelist" : "Failed to add panelist");
    }
  };

  const handleEdit = (p: Panelist) => {
    setEditing(p);
    setName(p.name);
    setDesignation(p.designation);
    setPosition(p.position);
    setEmail(p.email || '');
    setContact(p.contact || '');
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this panelist?")) return;
    try {
      await api.panelists.delete(id);
      toast.success("Panelist removed");
      fetchPanelists();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDesignation('');
    setPosition('');
    setEmail('');
    setContact('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search panelists..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => resetForm()}>
              <Plus className="h-4 w-4" /> Add Panelist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Panelist' : 'Add New Panelist'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPanelist} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Jane Smith" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. PhD, MIT" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Dean, Faculty" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number (Optional)</Label>
                <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} placeholder="09XX XXX XXXX" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">{editing ? 'Update Panelist' : 'Create Panelist'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Panelist Info</TableHead>
                <TableHead>Designation & Position</TableHead>
                <TableHead>Contact Detail</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading panelists...</TableCell>
                </TableRow>
              ) : filteredPanelists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No panelists found.</TableCell>
                </TableRow>
              ) : (
                filteredPanelists.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-base">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">ID: {p.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Award className="h-3 w-3 text-muted-foreground" /> {p.designation}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> {p.position}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {p.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {p.email}
                          </div>
                        )}
                        {p.contact && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {p.contact}
                          </div>
                        )}
                        {!p.email && !p.contact && (
                          <span className="text-xs text-muted-foreground italic">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" className="hover:bg-primary/10" onClick={() => handleEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
