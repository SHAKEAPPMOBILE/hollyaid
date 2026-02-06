import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Sparkles, Upload, X } from "lucide-react";
import { languages, paymentMethods, timeZones } from "@/components/preregistration/constants";
import { uploadPublicFile } from "@/components/preregistration/fileUpload";
import { preregSupabase } from "@/components/preregistration/supabase";
import { SpecialtyDialog } from "@/components/preregistration/SpecialtyDialog";
import type { SpecialistRegistrationFormData } from "@/components/preregistration/formTypes";

export function SpecialistRegistrationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [showOtherSpecialty, setShowOtherSpecialty] = useState(false);
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SpecialistRegistrationFormData>({
    fullName: "",
    email: "",
    phone: "",
    category: "",
    otherCategory: "",
    specialty: "",
    otherSpecialty: "",
    experience: "",
    languages: [],
    otherLanguage: "",
    timeZone: "",
    availability: "",
    paymentMethod: "",
    otherPaymentMethod: "",
    bio: "",
    linkedIn: "",
    website: "",
    profilePhoto: null,
    certifications: null,
    agreeToTerms: false,
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleLanguageChange = (language: string, checked: boolean) => {
    if (checked) {
      setSelectedLanguages((prev) => [...prev, language]);
    } else {
      setSelectedLanguages((prev) => prev.filter((l) => l !== language));
    }
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setSelectedSpecialties((prev) => {
      const next = checked ? [...prev, specialty] : prev.filter((s) => s !== specialty);
      if (specialty === "Other") {
        setShowOtherSpecialty(!!checked);
        if (!checked) {
          setFormData((current) => ({ ...current, otherSpecialty: "" }));
        }
      }
      return next;
    });
  };

  const specialtiesChips = useMemo(() => {
    if (selectedSpecialties.length === 0) return [];
    return selectedSpecialties.map((spec) => {
      if (spec === "Other" && formData.otherSpecialty.trim()) return formData.otherSpecialty.trim();
      return spec;
    });
  }, [selectedSpecialties, formData.otherSpecialty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const hasOtherSelected = selectedSpecialties.includes("Other");
      if (hasOtherSelected && !formData.otherSpecialty.trim()) {
        setError('Please specify your specialty for "Other".');
        setIsSubmitting(false);
        return;
      }

      const specialtiesToSave = selectedSpecialties
        .map((s) => (s === "Other" ? formData.otherSpecialty.trim() : s))
        .filter((s) => !!s && s.trim().length > 0);

      if (specialtiesToSave.length === 0) {
        setError("Please select at least one specialty.");
        setIsSubmitting(false);
        return;
      }

      let profilePhotoUrl: string | null = null;
      let certificationsUrl: string | null = null;

      if (formData.profilePhoto) {
        const fileName = `${Date.now()}-${formData.profilePhoto.name}`;
        profilePhotoUrl = await uploadPublicFile({
          file: formData.profilePhoto,
          bucket: "specialist-profiles",
          path: fileName,
        });
      }

      if (formData.certifications) {
        const fileName = `${Date.now()}-${formData.certifications.name}`;
        certificationsUrl = await uploadPublicFile({
          file: formData.certifications,
          bucket: "specialist-certifications",
          path: fileName,
        });
      }

      const registrationData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        specialty: specialtiesToSave.join(", "),
        other_specialty: showOtherSpecialty ? formData.otherSpecialty : null,
        experience: formData.experience,
        languages: selectedLanguages.length > 0 ? selectedLanguages : [],
        other_language: selectedLanguages.includes("Other") ? formData.otherLanguage : null,
        time_zone: formData.timeZone,
        availability: formData.availability,
        payment_method: formData.paymentMethod,
        other_payment_method: formData.paymentMethod === "Other" ? formData.otherPaymentMethod : null,
        bio: formData.bio || null,
        linkedin_profile: formData.linkedIn || null,
        website: formData.website || null,
        profile_photo_url: profilePhotoUrl,
        certifications_url: certificationsUrl,
      };

      const { error: insertError } = await preregSupabase
        .from("specialist_registrations")
        .insert([registrationData]);

      if (insertError) {
        console.error("Supabase error:", insertError);
        throw new Error(insertError.message);
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="gradient-border animate-fade-in-up">
        <CardContent className="p-8 text-center">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <Sparkles className="h-6 w-6 text-accent absolute -top-2 -right-2 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold gradient-text mb-4">You are ready to join us!</h3>
          <p className="text-muted-foreground leading-relaxed">
            We've received your application and will be in touch soon. You'll be among the first to know when Hollyaid
            launches.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`gradient-border transition-all duration-1000 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
      <CardHeader className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardTitle className="text-xl font-bold text-center gradient-text flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Specialist Pre-Registration
          <Sparkles className="h-5 w-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-primary pb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Essential Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Label htmlFor="fullName" className="text-sm font-medium text-primary">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  className="w-full mt-1 border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>

              <div className="w-full">
                <Label htmlFor="email" className="text-sm font-medium text-primary">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="w-full mt-1 border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="w-full">
                <Label htmlFor="phone" className="text-sm font-medium text-primary">
                  Phone / WhatsApp *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  required
                  className="w-full mt-1 border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-primary pb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Professional Details
            </h3>

            <div>
              <Label className="text-sm font-medium text-primary">Specialties *</Label>
              <div className="mt-2 flex items-center gap-4">
                <SpecialtyDialog
                  open={isSpecialtyModalOpen}
                  onOpenChange={setIsSpecialtyModalOpen}
                  selectedSpecialties={selectedSpecialties}
                  otherSpecialty={formData.otherSpecialty}
                  showOtherSpecialty={showOtherSpecialty}
                  onToggleSpecialty={handleSpecialtyChange}
                  onOtherSpecialtyChange={(value) => setFormData((prev) => ({ ...prev, otherSpecialty: value }))}
                  onClearAll={() => {
                    setSelectedSpecialties([]);
                    setShowOtherSpecialty(false);
                    setFormData((prev) => ({ ...prev, otherSpecialty: "" }));
                  }}
                />

                <div className="flex flex-wrap gap-2 flex-1">
                  {specialtiesChips.length > 0 ? (
                    specialtiesChips.map((chip, idx) => (
                      <span
                        key={`${chip}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 pl-2 pr-1 py-1 text-xs font-semibold text-primary"
                      >
                        {chip}
                        <button
                          type="button"
                          aria-label={`Remove ${chip}`}
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                          onClick={() => {
                            const original = selectedSpecialties[idx] ?? chip;
                            handleSpecialtyChange(original, false);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specialties selected</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="experience" className="text-sm font-medium text-primary">
                Years of Experience *
              </Label>
              <Input
                id="experience"
                required
                className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                placeholder="e.g., 5 years, Certified in..."
                value={formData.experience}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-primary">Languages Spoken *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {languages.map((language) => (
                  <label key={language} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedLanguages.includes(language)}
                      onCheckedChange={(checked) => handleLanguageChange(language, Boolean(checked))}
                      className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <span>{language}</span>
                  </label>
                ))}
              </div>
              {selectedLanguages.includes("Other") && (
                <div className="mt-3">
                  <Label htmlFor="otherLanguage" className="text-sm font-medium text-primary">
                    Please specify other language
                  </Label>
                  <Input
                    id="otherLanguage"
                    className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                    value={formData.otherLanguage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, otherLanguage: e.target.value }))}
                    placeholder="Enter language"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-primary">Time Zone *</Label>
                <Select value={formData.timeZone} onValueChange={(value) => setFormData((prev) => ({ ...prev, timeZone: value }))}>
                  <SelectTrigger className="mt-1 border-primary/30">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-primary">Preferred Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger className="mt-1 border-primary/30">
                    <SelectValue placeholder="Select payment" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.paymentMethod === "Other" && (
              <div>
                <Label htmlFor="otherPaymentMethod" className="text-sm font-medium text-primary">
                  Please specify payment method
                </Label>
                <Input
                  id="otherPaymentMethod"
                  className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  value={formData.otherPaymentMethod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, otherPaymentMethod: e.target.value }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="availability" className="text-sm font-medium text-primary">
                Availability *
              </Label>
              <Textarea
                id="availability"
                required
                className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                placeholder="e.g. Weekdays 9-5, evenings, weekends..."
                value={formData.availability}
                onChange={(e) => setFormData((prev) => ({ ...prev, availability: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-primary">
                Short Bio (optional)
              </Label>
              <Textarea
                id="bio"
                className="mt-1 w-full border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedIn" className="text-sm font-medium text-primary">
                  LinkedIn (optional)
                </Label>
                <Input
                  id="linkedIn"
                  className="mt-1 border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedIn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedIn: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="website" className="text-sm font-medium text-primary">
                  Website (optional)
                </Label>
                <Input
                  id="website"
                  className="mt-1 border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profilePhoto" className="text-sm font-medium text-primary">
                  Profile Photo
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/*"
                    className="border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                    onChange={(e) => setFormData((prev) => ({ ...prev, profilePhoto: e.target.files?.[0] ?? null }))}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="certifications" className="text-sm font-medium text-primary">
                  Certifications (PDF/JPEG)
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="certifications"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="border-primary/30 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                    onChange={(e) => setFormData((prev) => ({ ...prev, certifications: e.target.files?.[0] ?? null }))}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                required
                className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))}
              />
              <Label htmlFor="terms" className="text-sm text-primary">
                I agree to the Terms of Service and Privacy Policy *
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full gradient-bg hover:shadow-lg hover:shadow-primary/25 text-white py-3 animate-glow-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.agreeToTerms || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Submit Pre-Registration
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
