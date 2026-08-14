"use client";

import React, { useState } from "react";
import { updateCompanyDetailedProfile } from "@/actions/companyActions";
import { getCompanyDescriptionText, parseCompanyMetadata, serializeCompanyMetadata } from "@/lib/workflowHelpers";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fileToBase64 } from "@/lib/utils";
import {
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Users,
  ShieldCheck,
  Building,
  MapPin,
  Globe,
  Briefcase,
  Star,
  X,
} from "lucide-react";

interface ProfileFormProps {
  initialData?: {
    id: string;
    companyName: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    location: string | null;
    logoUrl: string | null;
    companySize: string | null;
    foundedYear: number | null;
    linkedin: string | null;
    email: string | null;
    phone: string | null;
    missionVision: string | null;
    workCulture: string | null;
    hiringPhilosophy: string | null;
    benefits: string[];
    teamMembers: any;
    galleryPhotos: string[];
    galleryVideos: string[];
    verificationBadges: string[];
    bannerUrl: string | null;
    officeLocations: string[];
  } | null;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  // Tabs: basic, values, team_perks, verification
  const [activeFormTab, setActiveFormTab] = useState<"basic" | "values" | "team_perks" | "verification">("basic");

  // Basic Details States
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [description, setDescription] = useState(getCompanyDescriptionText(initialData?.description));
  const [industry, setIndustry] = useState(initialData?.industry || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [companySize, setCompanySize] = useState(initialData?.companySize || "10-50 employees");
  const [foundedYear, setFoundedYear] = useState(initialData?.foundedYear || 2020);
  const [linkedin, setLinkedin] = useState(initialData?.linkedin || "");
  const [supportEmail, setSupportEmail] = useState(initialData?.email || "");
  const [supportPhone, setSupportPhone] = useState(initialData?.phone || "");

  // Logo file upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || "");

  // Banner file upload state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialData?.bannerUrl || "");

  // Office locations state
  const [officeLocationsStr, setOfficeLocationsStr] = useState(initialData?.officeLocations?.join(", ") || "");

  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(initialData?.galleryPhotos || []);
  const [galleryVideos, setGalleryVideos] = useState<string[]>(initialData?.galleryVideos || []);
  const [galleryTab, setGalleryTab] = useState<"PHOTO" | "VIDEO">("PHOTO");
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Company Values States
  const [missionVision, setMissionVision] = useState(initialData?.missionVision || "");
  const [workCulture, setWorkCulture] = useState(initialData?.workCulture || "");
  const [hiringPhilosophy, setHiringPhilosophy] = useState(initialData?.hiringPhilosophy || "");

  // Team Members States
  const [teamMembers, setTeamMembers] = useState<any[]>(
    Array.isArray(initialData?.teamMembers) ? initialData.teamMembers : []
  );
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberPhoto, setNewMemberPhoto] = useState("");
  const [memberPhotoUploading, setMemberPhotoUploading] = useState(false);
  const [newMemberLinkedin, setNewMemberLinkedin] = useState("");
  const [newMemberBio, setNewMemberBio] = useState("");
  const [newMemberSkills, setNewMemberSkills] = useState("");

  // Benefits & Perks States
  const [benefits, setBenefits] = useState<string[]>(initialData?.benefits || []);
  const [newBenefit, setNewBenefit] = useState("");

  // Verification Badges (Allows toggling for testing/mocking)
  const availableBadges = [
    "Identity Verified",
    "Business Verified",
    "Website Verified",
    "Payment Verified",
    "Trusted Employer",
    "Top Hiring Company",
  ];
  const [selectedBadges, setSelectedBadges] = useState<string[]>(
    initialData?.verificationBadges || ["Identity Verified"]
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const uploadGalleryFile = async (file: File, type: "PHOTO" | "VIDEO") => {
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        if (type === "PHOTO") {
          setGalleryPhotos((prev) => [...prev, url]);
        } else {
          setGalleryVideos((prev) => [...prev, url]);
        }
      } else {
        // Fallback to base64 for Vercel
        const base64 = await fileToBase64(file, 5.0);
        if (type === "PHOTO") {
          setGalleryPhotos((prev) => [...prev, base64]);
        } else {
          setGalleryVideos((prev) => [...prev, base64]);
        }
      }
    } catch (err: any) {
      console.warn("API Upload failed, using Base64 fallback:", err);
      try {
        const base64 = await fileToBase64(file, 5.0);
        if (type === "PHOTO") {
          setGalleryPhotos((prev) => [...prev, base64]);
        } else {
          setGalleryVideos((prev) => [...prev, base64]);
        }
      } catch (fallbackErr: any) {
        alert(fallbackErr.message || "Failed to process image file.");
      }
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleAddGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await uploadGalleryFile(e.target.files[0], "PHOTO");
    e.target.value = "";
  };

  const handleAddGalleryVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await uploadGalleryFile(e.target.files[0], "VIDEO");
    e.target.value = "";
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setGalleryPhotos(galleryPhotos.filter((_, idx) => idx !== index));
  };

  const handleRemoveGalleryVideo = (index: number) => {
    setGalleryVideos(galleryVideos.filter((_, idx) => idx !== index));
  };

  const handleUploadMemberPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMemberPhotoUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const { url } = await res.json();
          setNewMemberPhoto(url);
        } else {
          // Fallback to base64 for Vercel
          const base64 = await fileToBase64(file, 3.0);
          setNewMemberPhoto(base64);
        }
      } catch (err: any) {
        console.warn("API Upload failed, using Base64 fallback:", err);
        try {
          const base64 = await fileToBase64(file, 3.0);
          setNewMemberPhoto(base64);
        } catch (fallbackErr: any) {
          alert(fallbackErr.message || "Failed to process profile photo.");
        }
      } finally {
        setMemberPhotoUploading(false);
      }
    }
  };

  const handleAddTeamMember = () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    const newMember = {
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      photoUrl: newMemberPhoto.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMemberName}`,
      linkedinUrl: newMemberLinkedin.trim(),
      bio: newMemberBio.trim(),
      skills: newMemberSkills.split(",").map(s => s.trim()).filter(Boolean),
    };
    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName("");
    setNewMemberRole("");
    setNewMemberPhoto("");
    setNewMemberLinkedin("");
    setNewMemberBio("");
    setNewMemberSkills("");
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, idx) => idx !== index));
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    if (!benefits.includes(newBenefit.trim())) {
      setBenefits([...benefits, newBenefit.trim()]);
    }
    setNewBenefit("");
  };

  const handleRemoveBenefit = (perk: string) => {
    setBenefits(benefits.filter((b) => b !== perk));
  };

  const handleBadgeToggle = (badge: string) => {
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter((b) => b !== badge));
    } else {
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setMessage({ type: "error", text: "Company Name is required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      let finalLogoUrl = logoPreview;
      let finalBannerUrl = bannerPreview;

      // Convert logo to Base64 if a new file is selected
      if (logoFile) {
        try {
          finalLogoUrl = await fileToBase64(logoFile, 1.5);
        } catch (uploadErr: any) {
          setMessage({ type: "error", text: uploadErr.message || "Failed to process logo image." });
          setLoading(false);
          return;
        }
      }

      // Convert banner to Base64 if a new file is selected
      if (bannerFile) {
        try {
          finalBannerUrl = await fileToBase64(bannerFile, 1.5);
        } catch (uploadErr: any) {
          setMessage({ type: "error", text: uploadErr.message || "Failed to process banner image." });
          setLoading(false);
          return;
        }
      }

      const existingMeta = parseCompanyMetadata(initialData?.description);
      const fullDescription = serializeCompanyMetadata(description, existingMeta);

      await updateCompanyDetailedProfile({
        companyName,
        description: fullDescription,
        industry,
        website,
        location,
        logoUrl: finalLogoUrl || "",
        companySize,
        foundedYear: foundedYear ? Number(foundedYear) : 2020,
        linkedin,
        email: supportEmail,
        phone: supportPhone,
        missionVision,
        workCulture,
        hiringPhilosophy,
        benefits,
        teamMembers,
        verificationBadges: selectedBadges,
        bannerUrl: finalBannerUrl || "",
        officeLocations: officeLocationsStr.split(",").map((o) => o.trim()).filter(Boolean),
        galleryPhotos,
        galleryVideos,
      });

      setMessage({ type: "success", text: "Company profile updated successfully!" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Dynamically calculate company detailed completion rate
  let fieldsCount = 0;
  let filledCount = 0;

  const checkFilled = (val: any) => {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return val > 0;
    return !!val;
  };

  const fieldsToCheck = {
    companyName,
    description,
    logoPreview,
    bannerPreview,
    industry,
    website,
    location,
    linkedin,
    supportEmail,
    supportPhone,
    missionVision,
    teamMembers,
    galleryPhotos,
    officeLocationsStr
  };

  Object.values(fieldsToCheck).forEach((val) => {
    fieldsCount++;
    if (checkFilled(val)) filledCount++;
  });

  const completionPercent = Math.round((filledCount / fieldsCount) * 100);

  return (
    <Card className="p-8 w-full bg-white border border-[#E3E5EA] rounded-lg">
      {message && (
        <div
          className={`p-4 mb-6 rounded-lg text-xs font-medium border ${
            message.type === "success"
              ? "bg-[#F8F9FB] border-[#E3E5EA] text-[#1A1D29]"
              : "bg-[#FDEAEA] border-[#F5C2C2] text-[#BC2A2A]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Dynamic Completion Score */}
      <div className="bg-[#F8F9FB] border border-[#E3E5EA] p-4 rounded-lg mb-6 space-y-2 text-left">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-[#5B6272]">Profile Completion Strength</span>
          <span className="font-semibold text-[#1A1D29]">{completionPercent}% Complete</span>
        </div>
        <div className="w-full bg-[#E8F1FE] h-2 rounded-lg overflow-hidden">
          <div 
            className="bg-[#152C55] h-full rounded-lg transition-all duration-500" 
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-[#E3E5EA] gap-4 pb-2 mb-6 whitespace-nowrap scroll-smooth md:overflow-x-visible">
        {[
          { id: "basic", label: "Basic Details" },
          { id: "values", label: "Philosophy & Culture" },
          { id: "team_perks", label: "Team & Perks" },
          { id: "verification", label: "Badges" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFormTab(tab.id as any)}
            className={`text-xs font-medium pb-2 transition-all cursor-pointer border-b-2 px-1 shrink-0 ${
              activeFormTab === tab.id
                ? "border-[#1A1D29] text-[#1A1D29] font-semibold"
                : "border-transparent text-[#5B6272] hover:text-[#1A1D29]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: Basic details */}
        {activeFormTab === "basic" && (
          <div className="space-y-5">
            {/* Logo and Banner Upload Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Upload */}
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
                <div className="h-14 w-14 rounded-lg bg-white border border-[#C7CBD6] flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain rounded-md" />
                  ) : (
                    <Building className="h-7 w-7 text-[#2159C9]" />
                  )}
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="block text-[11px] font-bold uppercase text-[#5B6272] tracking-wider">Company Logo</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-file-input"
                    />
                    <label
                      htmlFor="logo-file-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3E5EA] rounded-full text-[11px] font-bold text-[#5B6272] hover:bg-[#E8F1FE] cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Choose Logo
                    </label>
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
                <div className="h-14 w-24 rounded-lg bg-white border border-[#E3E5EA] flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner Preview" className="h-full w-full object-cover rounded-md" />
                  ) : (
                    <Building className="h-7 w-7 text-[#2159C9]" />
                  )}
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="block text-[11px] font-bold uppercase text-[#5B6272] tracking-wider">Cover Banner</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                      id="banner-file-input"
                    />
                    <label
                      htmlFor="banner-file-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3E5EA] rounded-full text-[11px] font-bold text-[#5B6272] hover:bg-[#F0F3F9] cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Choose Banner
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Input
              label="Company Name"
              placeholder="Quantum Labs AI"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#5B6272]">Company Description</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                placeholder="Brief summary of your company domain, operations, and Gig expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Industry"
                placeholder="Artificial Intelligence"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={loading}
              />

              <Input
                label="Location"
                placeholder="San Francisco, CA or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Website URL"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={loading}
              />

              <Input
                label="LinkedIn Company URL"
                type="url"
                placeholder="https://linkedin.com/company/..."
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Size"
                placeholder="e.g. 250 Employees"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                disabled={loading}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#5B6272]">Founded Year</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                  placeholder="e.g. 2020"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(Number(e.target.value))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E3E5EA] pt-4">
              <Input
                label="Support / Contact Email"
                type="email"
                placeholder="contact@quantumlabs.ai"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={loading}
              />

              <Input
                label="Support / Contact Phone"
                placeholder="+1 (555) 123-4567"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            <Input
              label="Office Locations (comma-separated list)"
              placeholder="e.g. Austin HQ, Remote Team, London Office, India Development Center"
              value={officeLocationsStr}
              onChange={(e) => setOfficeLocationsStr(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* Tab 2: Values, Mission, Philosophy */}
        {activeFormTab === "values" && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#5B6272]">Mission & Vision</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                placeholder="Detail what guides the company values..."
                value={missionVision}
                onChange={(e) => setMissionVision(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#5B6272]">Work Culture</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                placeholder="Detail work environment, iterations, feedback routines..."
                value={workCulture}
                onChange={(e) => setWorkCulture(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#5B6272]">Hiring Philosophy</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#C7CBD6] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                placeholder="Detail qualities, agency limits, design standards..."
                value={hiringPhilosophy}
                onChange={(e) => setHiringPhilosophy(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Team Members & Perks */}
        {activeFormTab === "team_perks" && (
          <div className="space-y-6">
            {/* Team Showcase list */}
            <div className="space-y-4">
              <div className="border-b border-[#E3E5EA] pb-2">
                <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">Team Showcase</h3>
                <p className="text-[11px] text-[#5B6272] font-semibold">Build a professional showcase of your leadership team and core members</p>
              </div>

              {teamMembers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-[#E3E5EA] rounded-lg relative flex flex-col justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(idx)}
                        className="absolute top-3 right-3 p-1.5 text-[#BC2A2A] hover:bg-[#FDEAEA] rounded-full transition-colors cursor-pointer"
                        title="Delete team member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="flex gap-3">
                        <div className="h-14 w-14 bg-[#E8F1FE] border border-[#C7CBD6] rounded-lg flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name[0]
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#1A1D29] truncate">{member.name}</h4>
                          <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">{member.role}</p>
                          {member.linkedinUrl && (
                            <a 
                              href={member.linkedinUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[11px] text-[#2159C9] font-bold hover:underline block"
                            >
                              LinkedIn Profile
                            </a>
                          )}
                        </div>
                      </div>

                      {member.bio && (
                        <p className="text-[11px] text-[#5B6272] bg-[#F8F9FB] border border-[#E3E5EA] p-2.5 rounded-lg italic mt-3">
                          &quot;{member.bio}&quot;
                        </p>
                      )}

                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.skills.map((s: string, sIdx: number) => (
                            <Badge key={sIdx} variant="neutral" className="text-[11px] py-0.5 px-2">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add member controls */}
              <div className="p-4 bg-[#F8F9FB] border border-[#E3E5EA]/60 rounded-lg space-y-4">
                <span className="block text-[11px] font-bold uppercase text-[#5B6272] tracking-wider">Add Team Showcase Card</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Sarah Jenkins"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <Input
                    label="Position / Role"
                    placeholder="e.g. Chief Executive Officer (CEO)"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                  />
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="new-member-photo-upload"
                        className="hidden"
                        onChange={handleUploadMemberPhoto}
                        disabled={memberPhotoUploading}
                      />
                      <label
                        htmlFor="new-member-photo-upload"
                        className={`inline-flex items-center gap-1.5 px-4.5 py-2.5 border rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          memberPhotoUploading 
                            ? "bg-[#E8F1FE] text-[#5B6272] border-[#E3E5EA] cursor-not-allowed" 
                            : "bg-white text-[#1A1D29] border-[#C7CBD6] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {memberPhotoUploading ? "Uploading..." : "Upload Photo (max 5MB)"}
                      </label>
                      {newMemberPhoto && (
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#E3E5EA] bg-[#F8F9FB] shrink-0">
                          <img src={newMemberPhoto} alt="preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="LinkedIn Profile URL"
                    placeholder="e.g. https://linkedin.com/in/sarah"
                    value={newMemberLinkedin}
                    onChange={(e) => setNewMemberLinkedin(e.target.value)}
                  />
                  <Input
                    label="Expertise Skills (comma separated)"
                    placeholder="e.g. leadership, fintech, next.js"
                    value={newMemberSkills}
                    onChange={(e) => setNewMemberSkills(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Short Professional Bio</label>
                  <textarea
                    placeholder="Explain background, achievements, or vision..."
                    value={newMemberBio}
                    onChange={(e) => setNewMemberBio(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-md border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-xs text-[#1A1D29] bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={handleAddTeamMember}
                    className="h-9 px-5 flex items-center justify-center cursor-pointer text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Team Member
                  </Button>
                </div>
              </div>
            </div>

            {/* Office & Event Gallery Upload */}
            <div className="space-y-4 border-t border-[#E3E5EA] pt-4">
              <div className="border-b border-[#E3E5EA] pb-2">
                <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">Company Gallery — Photos</h3>
                <p className="text-[11px] text-[#5B6272] font-semibold">Upload photos of your workspace, office, team events, and culture</p>
              </div>

              {/* Photos grid */}
              {galleryPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[#E3E5EA] group bg-[#E8F1FE]">
                      <img src={photo} className="h-full w-full object-cover" alt="Gallery photo" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryPhoto(idx)}
                        className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-[#FDEAEA] text-[#BC2A2A] rounded-full border border-[#E3E5EA] cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={handleAddGalleryPhoto} className="hidden" id="gallery-photo-input" disabled={galleryUploading} />
                <label
                  htmlFor="gallery-photo-input"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                    galleryUploading ? "bg-[#EAF1FE] text-[#5B6272] cursor-not-allowed" : "bg-[#152C55] hover:bg-[#FFF3DC] text-white"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {galleryUploading ? "Uploading…" : "Upload Photo (max 5MB)"}
                </label>
              </div>
            </div>


            {/* Benefits list */}
            <div className="space-y-4 border-t border-[#E3E5EA] pt-4">
              <div className="border-b border-[#E3E5EA] pb-2">
                <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">Benefits & Perks Offered</h3>
                <p className="text-[11px] text-[#5B6272]">Add perks freelancers view on your profile page</p>
              </div>

              {benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {benefits.map((perk, idx) => (
                    <Badge
                      key={idx}
                      className="text-[11px] font-bold text-[#5B6272] bg-[#F0F3F9] hover:bg-[#FDEAEA] hover:text-[#BC2A2A] transition-colors py-1 px-2.5 flex items-center gap-1.5 cursor-pointer border-[#E3E5EA]"
                      onClick={() => handleRemoveBenefit(perk)}
                      title="Click to remove"
                    >
                      <span>{perk}</span>
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. Free Learning Budget"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                />
                <Button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-6 cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add Perk
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Verification Badges */}
        {activeFormTab === "verification" && (
          <div className="space-y-5">
            <div className="border-b border-[#E3E5EA] pb-2">
              <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">Verification Badges</h3>
              <p className="text-[11px] text-[#5B6272]">Earned or verified profile indicators</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {availableBadges.map((badge) => {
                const isActive = selectedBadges.includes(badge);
                return (
                  <div
                    key={badge}
                    onClick={() => handleBadgeToggle(badge)}
                    className={`p-4 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#E8F1FE]/20 border-[#C7CBD6] text-[#1A1D29] font-bold"
                        : "bg-white border-[#E3E5EA] text-[#5B6272]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`h-5 w-5 ${isActive ? "text-[#2159C9]" : "text-[#2159C9]"}`} />
                      <span className="text-xs">{badge}</span>
                    </div>
                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        isActive ? "bg-[#EAF1FE] border-[#C7CBD6]" : "border-[#C7CBD6]"
                      }`}
                    >
                      {isActive && <span className="h-1.5 w-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full mt-4 cursor-pointer font-bold text-sm h-11" disabled={loading}>
          {loading ? "Saving Profile Changes..." : "Update Detailed Profile"}
        </Button>
      </form>
    </Card>
  );
}
