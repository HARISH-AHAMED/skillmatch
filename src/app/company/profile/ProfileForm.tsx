"use client";

import React, { useState } from "react";
import { updateCompanyDetailedProfile } from "@/actions/companyActions";
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
  const [description, setDescription] = useState(initialData?.description || "");
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

  // Gallery Photos state
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(initialData?.galleryPhotos || []);

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

  const handleAddGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file, 1.5);
        setGalleryPhotos([...galleryPhotos, base64]);
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Failed to process gallery image.");
      }
    }
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setGalleryPhotos(galleryPhotos.filter((_, idx) => idx !== index));
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

      await updateCompanyDetailedProfile({
        companyName,
        description,
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
    <Card className="p-8 w-full shadow-md border border-slate-100 rounded-3xl">
      {message && (
        <div
          className={`p-4 mb-6 rounded-2xl text-xs font-bold border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Dynamic Completion Score */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl mb-6 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-705">Profile Completion Strength</span>
          <span className="font-black text-[#002d59]">{completionPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-[#3ac0ff] to-[#002d59] h-full rounded-full transition-all duration-500" 
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 gap-4 pb-2 mb-6 whitespace-nowrap scroll-smooth md:overflow-x-visible">
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
            className={`text-xs font-bold pb-2 transition-all cursor-pointer border-b-2 px-1 shrink-0 ${
              activeFormTab === tab.id
                ? "border-[#002d59] text-[#002d59] font-black"
                : "border-transparent text-slate-400 hover:text-slate-700"
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
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain rounded-xl" />
                  ) : (
                    <Building className="h-7 w-7 text-slate-350" />
                  )}
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Company Logo</span>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" /> Choose Logo
                    </label>
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="h-14 w-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner Preview" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Building className="h-7 w-7 text-slate-350" />
                  )}
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Cover Banner</span>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer shadow-sm"
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
              <label className="block text-xs font-semibold text-slate-650">Company Description</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
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
                <label className="block text-xs font-semibold text-slate-650">Founded Year</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                  placeholder="e.g. 2020"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(Number(e.target.value))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-150 pt-4">
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
              <label className="block text-xs font-semibold text-slate-650">Mission & Vision</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                placeholder="Detail what guides the company values..."
                value={missionVision}
                onChange={(e) => setMissionVision(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-650">Work Culture</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                placeholder="Detail work environment, iterations, feedback routines..."
                value={workCulture}
                onChange={(e) => setWorkCulture(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-650">Hiring Philosophy</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
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
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">Team Showcase</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Build a professional showcase of your leadership team and core members</p>
              </div>

              {teamMembers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs relative flex flex-col justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(idx)}
                        className="absolute top-3 right-3 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete team member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="flex gap-3">
                        <div className="h-14 w-14 bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name[0]
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-xs font-black text-[#002d59] truncate">{member.name}</h4>
                          <p className="text-[10px] text-slate-550 font-black uppercase tracking-wider">{member.role}</p>
                          {member.linkedinUrl && (
                            <a 
                              href={member.linkedinUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-[#3ac0ff] font-bold hover:underline block"
                            >
                              LinkedIn Profile
                            </a>
                          )}
                        </div>
                      </div>

                      {member.bio && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-xl italic mt-3">
                          &quot;{member.bio}&quot;
                        </p>
                      )}

                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.skills.map((s: string, sIdx: number) => (
                            <Badge key={sIdx} variant="neutral" className="text-[8px] py-0.5 px-2">
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
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Add Team Showcase Card</span>
                
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
                  <Input
                    label="Avatar seed / Photo URL"
                    placeholder="e.g. sarah (for Dicebear avatar)"
                    value={newMemberPhoto}
                    onChange={(e) => setNewMemberPhoto(e.target.value)}
                  />
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
                  <label className="block text-[10px] font-bold text-slate-550 uppercase">Short Professional Bio</label>
                  <textarea
                    placeholder="Explain background, achievements, or vision..."
                    value={newMemberBio}
                    onChange={(e) => setNewMemberBio(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-xs text-slate-800 bg-white"
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
            <div className="space-y-4 border-t border-slate-150 pt-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">Company Gallery</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Upload photos of your workspace, office, team events, and culture highlights</p>
              </div>

              {/* Gallery Photos Grid */}
              {galleryPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                      <img src={photo} className="h-full w-full object-cover" alt="Gallery preview" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryPhoto(idx)}
                        className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-rose-50 text-rose-500 rounded-lg shadow-sm border border-slate-100 cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddGalleryPhoto}
                  className="hidden"
                  id="gallery-file-input"
                />
                <label
                  htmlFor="gallery-file-input"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#002d59] hover:bg-[#001f3f] text-white rounded-xl text-[10px] font-bold cursor-pointer shadow-sm transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Office/Team Photo
                </label>
              </div>
            </div>

            {/* Benefits list */}
            <div className="space-y-4 border-t border-slate-150 pt-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">Benefits & Perks Offered</h3>
                <p className="text-[10px] text-slate-400">Add perks freelancers view on your profile page</p>
              </div>

              {benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {benefits.map((perk, idx) => (
                    <Badge
                      key={idx}
                      className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors py-1 px-2.5 flex items-center gap-1.5 cursor-pointer shadow-sm border-slate-200"
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
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
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
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">Verification Badges</h3>
              <p className="text-[10px] text-slate-400">Earned or verified profile indicators</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {availableBadges.map((badge) => {
                const isActive = selectedBadges.includes(badge);
                return (
                  <div
                    key={badge}
                    onClick={() => handleBadgeToggle(badge)}
                    className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isActive
                        ? "bg-sky-50/20 border-sky-300 text-[#002d59] font-bold shadow-sm"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`h-5 w-5 ${isActive ? "text-[#3ac0ff]" : "text-slate-350"}`} />
                      <span className="text-xs">{badge}</span>
                    </div>
                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        isActive ? "bg-[#3ac0ff] border-[#3ac0ff]" : "border-slate-300"
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
