import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

type RateTier = 'standard' | 'advanced' | 'expert' | 'master';

const RATE_TIER_CONFIG: Record<RateTier, { label: string; minuteCost: number; hourlyRate: number }> = {
  standard: { label: 'Standard', minuteCost: 60, hourlyRate: 60 },
  advanced: { label: 'Advanced', minuteCost: 96, hourlyRate: 96 },
  expert: { label: 'Expert', minuteCost: 144, hourlyRate: 144 },
  master: { label: 'Master', minuteCost: 192, hourlyRate: 192 },
};

interface Specialist {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  website?: string | null;
  rate_tier?: string | null;
  hourly_rate?: number;
  user_id?: string | null;
}

interface SpecialistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialist?: Specialist | null;
  onSuccess: () => void;
  onLogActivity?: (
    actionType: string,
    targetType: string,
    targetId: string | null,
    targetName: string | null,
    details?: Record<string, any>
  ) => Promise<void>;
}

const SpecialistFormDialog: React.FC<SpecialistFormDialogProps> = ({
  open,
  onOpenChange,
  specialist,
  onSuccess,
  onLogActivity,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEdit = !!specialist;
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [rateTier, setRateTier] = useState<RateTier | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Reset form when dialog opens/closes or specialist changes
  useEffect(() => {
    if (open && specialist) {
      setFullName(specialist.full_name || '');
      setEmail(specialist.email || '');
      setSpecialty(specialist.specialty || '');
      setWebsite(specialist.website || '');
      setBio(specialist.bio || '');
      setRateTier((specialist.rate_tier as RateTier) || '');
      setAvatarPreview(specialist.avatar_url || null);
      setAvatarFile(null);
    } else if (open && !specialist) {
      resetForm();
    }
  }, [open, specialist]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setSpecialty('');
    setWebsite('');
    setBio('');
    setRateTier('');
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let avatarUrl: string | null = isEdit ? (specialist?.avatar_url || null) : null;

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

    if (isEdit && specialist) {
      // Build update object
      const updateData: Record<string, any> = {
        full_name: fullName,
        email: email,
        specialty: specialty,
        website: website || null,
        bio: bio || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      // If rate tier is set, also update hourly_rate
      if (rateTier) {
        updateData.rate_tier = rateTier;
        updateData.hourly_rate = RATE_TIER_CONFIG[rateTier].hourlyRate;
      }

      // Update existing specialist
      const { error } = await supabase
        .from('specialists')
        .update(updateData)
        .eq('id', specialist.id);

      if (error) {
        toast({
          title: "Failed to update specialist",
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (onLogActivity) {
          await onLogActivity('update', 'specialist', specialist.id, fullName, { 
            email, 
            specialty,
            rate_tier: rateTier || undefined,
          });
        }
        toast({
          title: "Specialist updated",
          description: `${fullName}'s profile has been updated.${rateTier ? ` Rate tier set to ${RATE_TIER_CONFIG[rateTier].label}.` : ''}`,
        });
        onOpenChange(false);
        onSuccess();
      }
    } else {
      // Add new specialist
      const { data: insertedData, error } = await supabase
        .from('specialists')
        .insert({
          full_name: fullName,
          email: email,
          specialty: specialty,
          website: website || null,
          bio: bio || null,
          hourly_rate: 25, // Placeholder, specialist will set their tier on signup
          is_active: false, // Inactive until specialist completes signup
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Failed to add specialist",
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (onLogActivity) {
          await onLogActivity('add', 'specialist', insertedData?.id || null, fullName, { email, specialty });
        }
        toast({
          title: "Specialist added",
          description: `${fullName} has been added to the platform.`,
        });
        onOpenChange(false);
        resetForm();
        onSuccess();
      }
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Specialist' : 'Add New Specialist'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              disabled={isEdit && !!specialist?.email}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">Email cannot be changed after creation</p>
            )}
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
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Rate Tier - Only shown when editing */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="rate-tier">Rate Tier</Label>
              <Select 
                value={rateTier} 
                onValueChange={(value) => setRateTier(value as RateTier)}
              >
                <SelectTrigger id="rate-tier">
                  <SelectValue placeholder="Select rate tier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RATE_TIER_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label} — {config.minuteCost} mins/hr (${config.hourlyRate}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Setting a rate tier will approve this specialist and determine their session cost.
              </p>
            </div>
          )}
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
            {submitting ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Specialist')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SpecialistFormDialog;
