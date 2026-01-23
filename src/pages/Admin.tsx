import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Plus, Users, Building2, Calendar, 
  Edit, Trash2, UserPlus, Clock, Upload, X
} from 'lucide-react';

interface Specialist {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  bio: string | null;
  hourly_rate: number;
  is_active: boolean;
  avatar_url: string | null;
  user_id: string | null;
  rate_tier: string | null;
}

// Only these emails can invite specialists
const ALLOWED_INVITE_EMAILS = ['info@hollyaid.com', 'contact@shakeapp.today'];

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if current user can invite specialists
  const canInviteSpecialists = user?.email && ALLOWED_INVITE_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (data) {
      setIsAdmin(true);
      fetchSpecialists();
    } else {
      toast({
        title: "Access denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const fetchSpecialists = async () => {
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSpecialists(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let avatarUrl: string | null = null;

    // Upload avatar if one was selected
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('specialist-avatars')
        .upload(fileName, avatarFile);

      if (uploadError) {
        toast({
          title: "Failed to upload image",
          description: uploadError.message,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('specialist-avatars')
        .getPublicUrl(fileName);
      
      avatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from('specialists')
      .insert({
        full_name: fullName,
        email: email,
        specialty: specialty,
        bio: bio || null,
        hourly_rate: 25, // Placeholder, specialist will set their tier on signup
        is_active: false, // Inactive until specialist completes signup
        avatar_url: avatarUrl,
      });

    if (error) {
      toast({
        title: "Failed to add specialist",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Specialist added",
        description: `${fullName} has been added to the platform.`,
      });
      setShowAddDialog(false);
      resetForm();
      fetchSpecialists();
    }

    setSubmitting(false);
  };

  const toggleSpecialistStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('specialists')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      fetchSpecialists();
      toast({
        title: currentStatus ? "Specialist deactivated" : "Specialist activated",
      });
    }
  };

  const deleteSpecialist = async (id: string) => {
    const { error } = await supabase
      .from('specialists')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchSpecialists();
      toast({
        title: "Specialist removed",
      });
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setSpecialty('');
    setBio('');
    clearAvatar();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center relative">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="absolute left-4">
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage specialists and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{specialists.length}</p>
                  <p className="text-sm text-muted-foreground">Total Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <UserPlus className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {specialists.filter(s => s.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary">
                  <Clock className="text-muted-foreground" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {specialists.filter(s => !s.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Inactive Specialists</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Specialists Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Specialists</CardTitle>
              <CardDescription>Manage wellness specialists on the platform</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="wellness">
                  <Plus size={16} />
                  Add Specialist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Specialist</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSpecialist} className="space-y-4 mt-4">
                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <div className="flex items-center gap-4">
                      {avatarPreview ? (
                        <div className="relative">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={avatarPreview} />
                            <AvatarFallback>
                              {fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'SP'}
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={clearAvatar}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="text-muted-foreground" size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG or GIF. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Jane Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Mental Health, Yoga, Nutrition..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (optional)</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief description of experience and approach..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" variant="wellness" className="w-full" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Specialist'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {specialists.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No specialists added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specialist</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialists.map((specialist) => (
                    <TableRow key={specialist.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={specialist.avatar_url || undefined} />
                            <AvatarFallback>
                              {specialist.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{specialist.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{specialist.email}</TableCell>
                      <TableCell>{specialist.specialty}</TableCell>
                      <TableCell>
                        {specialist.user_id ? (
                          <span className="font-medium">${specialist.hourly_rate}/hr</span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Pending signup</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={specialist.is_active}
                          onCheckedChange={() => toggleSpecialistStatus(specialist.id, specialist.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canInviteSpecialists && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { data, error } = await supabase.functions.invoke('invite-specialist', {
                                body: { specialistId: specialist.id }
                              });
                              if (error) {
                                toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
                              } else {
                                toast({ title: "Invitation sent!", description: data.invitationLink ? `Link: ${data.invitationLink}` : data.message });
                              }
                            }}
                            disabled={!!specialist.user_id}
                          >
                            <UserPlus size={14} />
                            {specialist.user_id ? 'Registered' : 'Invite'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteSpecialist(specialist.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
