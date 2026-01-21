import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Bell, Save, Loader2, User, Briefcase, Building2, Camera, X, RotateCcw, Video, Trash2 } from 'lucide-react';
import { resetOnboardingTour } from '@/components/OnboardingTour';
import { useTranslation } from 'react-i18next';
import LanguagePicker from '@/components/LanguagePicker';

type NotificationPreference = 'email' | 'whatsapp' | 'both';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>('both');

  // Specialist-specific fields
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [specialistAvatarUrl, setSpecialistAvatarUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number, job_title, department, avatar_url, notification_preference')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setFullName(profileData.full_name || '');
        setEmail(profileData.email || '');
        setPhoneNumber(profileData.phone_number || '');
        setJobTitle(profileData.job_title || '');
        setDepartment(profileData.department || '');
        setAvatarUrl(profileData.avatar_url || null);
        setNotificationPreference((profileData.notification_preference as NotificationPreference) || 'both');
      }

      // Check if user is a specialist
      const { data: specialistData } = await supabase
        .from('specialists')
        .select('id, full_name, email, phone_number, specialty, bio, avatar_url, video_url')
        .eq('user_id', user.id)
        .single();

      if (specialistData) {
        setIsSpecialist(true);
        setSpecialistId(specialistData.id);
        // Prefer specialist data for these fields if available
        setFullName(specialistData.full_name || profileData?.full_name || '');
        setPhoneNumber(specialistData.phone_number || profileData?.phone_number || '');
        setSpecialty(specialistData.specialty || '');
        setBio(specialistData.bio || '');
        setSpecialistAvatarUrl(specialistData.avatar_url || null);
        setVideoUrl(specialistData.video_url || null);
      }

      // Note: Company billing/plan details live on the dedicated Company Billing page.
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // If specialist, also update specialist avatar
      if (isSpecialist && specialistId) {
        await supabase
          .from('specialists')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', specialistId);
        setSpecialistAvatarUrl(publicUrl);
      }

      setAvatarUrl(publicUrl);

      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setUploadingAvatar(true);

    try {
      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // If specialist, also update specialist avatar
      if (isSpecialist && specialistId) {
        await supabase
          .from('specialists')
          .update({ avatar_url: null, updated_at: new Date().toISOString() })
          .eq('id', specialistId);
        setSpecialistAvatarUrl(null);
      }

      setAvatarUrl(null);

      toast({
        title: "Photo removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !specialistId) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, MOV, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a video smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    // Validate video duration (max 60 seconds)
    try {
      const duration = await getVideoDuration(file);
      if (duration > 60) {
        toast({
          title: "Video too long",
          description: `Your video is ${Math.round(duration)} seconds. Please upload a video under 1 minute.`,
          variant: "destructive",
        });
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
        }
        return;
      }
    } catch (error) {
      console.error('Error checking video duration:', error);
      // Continue with upload if duration check fails
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/intro-${Date.now()}.${fileExt}`;

      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload with progress tracking using XMLHttpRequest
      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/specialist-videos/${fileName}`;
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setVideoUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
        
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('specialist-videos')
        .getPublicUrl(fileName);

      // Update specialist with new video URL
      const { error: updateError } = await supabase
        .from('specialists')
        .update({ video_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', specialistId);

      if (updateError) throw updateError;

      setVideoUrl(publicUrl);

      toast({
        title: "Video uploaded",
        description: "Your intro video has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveVideo = async () => {
    if (!user || !specialistId) return;

    setUploadingVideo(true);

    try {
      const { error: updateError } = await supabase
        .from('specialists')
        .update({ video_url: null, updated_at: new Date().toISOString() })
        .eq('id', specialistId);

      if (updateError) throw updateError;

      setVideoUrl(null);

      toast({
        title: "Video removed",
        description: "Your intro video has been removed.",
      });
    } catch (error) {
      console.error('Error removing video:', error);
      toast({
        title: "Error",
        description: "Failed to remove video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if WhatsApp is selected
    if ((notificationPreference === 'whatsapp' || notificationPreference === 'both') && !phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to receive WhatsApp notifications.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          job_title: jobTitle.trim() || null,
          department: department.trim() || null,
          notification_preference: notificationPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update specialist data if applicable
      if (isSpecialist && specialistId) {
        const { error: specialistError } = await supabase
          .from('specialists')
          .update({
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim() || null,
            specialty: specialty.trim(),
            bio: bio.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', specialistId);

        if (specialistError) throw specialistError;
      }

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });

      // Navigate back to the appropriate dashboard
      if (isSpecialist) {
        navigate('/specialist-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  const displayAvatarUrl = isSpecialist ? (specialistAvatarUrl || avatarUrl) : avatarUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center relative">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="absolute left-4">
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>
          <div className="absolute right-4">
            <LanguagePicker />
          </div>
          <div className="flex-1 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Hello, {fullName ? fullName.split(' ')[0] : 'there'}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your profile and notification preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Photo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera size={20} />
                Profile Photo
              </CardTitle>
              <CardDescription>
                Upload a photo to personalize your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-2 border-border">
                    <AvatarImage src={displayAvatarUrl || undefined} alt={fullName} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(fullName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                  >
                    <Camera size={16} />
                    {displayAvatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {displayAvatarUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <X size={16} />
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information Card (for employees/admins) */}
          {!isSpecialist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} />
                  Work Information
                </CardTitle>
                <CardDescription>
                  Your role and department details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialist Information Card */}
          {isSpecialist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={20} />
                  Professional Profile
                </CardTitle>
                <CardDescription>
                  Your specialist profile visible to employees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty *</Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder="e.g., Counselling, Life Coaching"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell employees about your experience and approach..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your public profile
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intro Video Card (Specialists Only) */}
          {isSpecialist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video size={20} />
                  Intro Video
                </CardTitle>
                <CardDescription>
                  Upload a 1-minute video introducing yourself to potential clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                
                {videoUrl ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full h-full object-contain"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleVideoClick}
                        disabled={uploadingVideo}
                      >
                        {uploadingVideo ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Video size={16} />
                        )}
                        Replace Video
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveVideo}
                        disabled={uploadingVideo}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={16} />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      uploadingVideo 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-muted-foreground/25 cursor-pointer hover:border-primary/50'
                    }`}
                    onClick={!uploadingVideo ? handleVideoClick : undefined}
                  >
                    {uploadingVideo ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              className="text-muted"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              className="text-primary"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - videoUploadProgress / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary">
                            {videoUploadProgress}%
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">Uploading video...</p>
                        <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${videoUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Video size={32} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload your intro video</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          MP4, MOV or WebM. Max 100MB, recommended 1 minute.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone size={20} />
                Contact Information
              </CardTitle>
              <CardDescription>
                Your phone number is used for WhatsApp/SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp or Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Include country code for international numbers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive booking notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={notificationPreference}
                onValueChange={(value) => setNotificationPreference(value as NotificationPreference)}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="both" id="both" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="both" className="text-base font-medium cursor-pointer">
                      Email + WhatsApp (Recommended)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get notified via both email and WhatsApp for maximum reliability
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="email" id="email" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="email" className="text-base font-medium cursor-pointer">
                      Email Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive all notifications via email
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="whatsapp" id="whatsapp" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="whatsapp" className="text-base font-medium cursor-pointer">
                      WhatsApp/SMS Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive instant notifications on your phone (requires phone number)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Onboarding Tour */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw size={20} />
                Onboarding Tour
              </CardTitle>
              <CardDescription>
                Restart the welcome tour to learn about platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => {
                  // Reset all tour keys
                  resetOnboardingTour('employee-dashboard');
                  resetOnboardingTour('company-admin-dashboard');
                  resetOnboardingTour('specialist-dashboard');
                  toast({
                    title: "Tour Reset",
                    description: "The onboarding tour will show again when you visit your dashboard.",
                  });
                }}
              >
                <RotateCcw size={16} />
                Restart Onboarding Tour
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
