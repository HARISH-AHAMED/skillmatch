"use client";

import React, { useState } from "react";
import { updateCompanyDetailedProfile } from "@/actions/companyActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

  const handleAddTeamMember = () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    const newMember = {
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      photoUrl: newMemberPhoto.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMemberName}`,
    };
    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName("");
    setNewMemberRole("");
    setNewMemberPhoto("");
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

      // Upload logo if a new file is selected
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalLogoUrl = uploadData.url;
        } else {
          console.error("Logo upload failed.");
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 pb-2 mb-6">
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
            className={`text-xs font-bold pb-2 transition-all cursor-pointer border-b-2 px-1 ${
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
            {/* Logo Upload row */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain rounded-xl" />
                ) : (
                  <Building className="h-8 w-8 text-slate-350" />
                )}
              </div>
              <div className="space-y-1.5 flex-grow">
                <span className="block text-xs font-bold text-slate-700">Company Logo Banner</span>
                <div className="flex items-center gap-3">
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
                  {logoFile && <span className="text-[10px] text-slate-500 font-semibold">{logoFile.name}</span>}
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
                <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">Team Members List</h3>
                <p className="text-[10px] text-slate-400">List contacts for freelancer workflows</p>
              </div>

              {teamMembers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-sky-100 border border-sky-200 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name[0]
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-[#002d59]">{member.name}</h4>
                          <span className="text-[10px] text-slate-550 font-semibold">{member.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add member controls */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                <Input
                  label="Name"
                  placeholder="John Doe"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
                <Input
                  label="Role"
                  placeholder="HR Manager"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    label="Photo Avatar Seed"
                    placeholder="John (Dicebear)"
                    value={newMemberPhoto}
                    onChange={(e) => setNewMemberPhoto(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTeamMember}
                    className="h-10 px-4 shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
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
                  className="px-6 cursor-pointer flex items-center gap-1 font-bold text-xs"
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
