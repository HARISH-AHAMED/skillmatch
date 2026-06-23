"use client";

import React, { useState } from "react";
import { updateFreelancerProfile } from "@/actions/profileActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  FileText,
  Plus,
  Trash2,
  Briefcase,
  Award,
  Upload,
  Clock,
  Activity,
  CheckCircle,
  ExternalLink,
  Video,
  Image as ImageIcon,
  Globe,
  FileCode,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";

interface ProfileFormProps {
  initialData?: {
    bio: string | null;
    skills: string[];
    experienceYears: number;
    portfolioUrl: string | null;
    resumeUrl?: string | null;
    professionalHeadline?: string | null;
    experience?: any; // JSON
    certifications?: any; // JSON
    portfolioItems?: any; // JSON
    responseTime?: string | null;
    availabilityStatus?: string | null;
    verificationBadges?: string[];
    user?: {
      name: string | null;
      image: string | null;
    } | null;
  } | null;
}

interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
  imageUrl?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: "IMAGE" | "VIDEO" | "GITHUB" | "WEBSITE" | "CASE_STUDY";
  url?: string;
  fileUrl?: string;
  images?: string[];
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  // Tabs: info, skills, experience, certifications, portfolio
  const [activeTab, setActiveTab] = useState<"info" | "skills" | "experience" | "certifications" | "portfolio">("info");

  // Basic Profile Info state
  const [name, setName] = useState(initialData?.user?.name || "");
  const [image, setImage] = useState(initialData?.user?.image || "");
  const [professionalHeadline, setProfessionalHeadline] = useState(initialData?.professionalHeadline || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [responseTime, setResponseTime] = useState(initialData?.responseTime || "Within 24 hours");
  const [availabilityStatus, setAvailabilityStatus] = useState(initialData?.availabilityStatus || "AVAILABLE");
  const [verificationBadges, setVerificationBadges] = useState<string[]>(initialData?.verificationBadges || ["Identity Verified"]);

  // Skills & Resume
  const [skillsStr, setSkillsStr] = useState(initialData?.skills.join(", ") || "");
  const [experienceYears, setExperienceYears] = useState(initialData?.experienceYears || 0);
  const [resumeUrl, setResumeUrl] = useState(initialData?.resumeUrl || "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Dynamic Lists state
  const [experience, setExperience] = useState<ExperienceItem[]>(
    (initialData?.experience as ExperienceItem[]) || []
  );

  const [certifications, setCertifications] = useState<CertificationItem[]>(
    (initialData?.certifications as CertificationItem[]) || []
  );

  // Default seeded portfolio items if empty
  const defaultPortfolioItems: PortfolioItem[] = [
    {
      id: "port-1",
      title: "Expense Tracker",
      description: "A finance dashboard application to track monthly budget transactions, categorize expenses, and visualize spending patterns through SVG charts.",
      type: "GITHUB",
      url: "https://github.com/alexrivera/expense-tracker",
    },
    {
      id: "port-2",
      title: "Movie Search App",
      description: "React client integrating with the TMDB API to search movies, view ratings, bookmark favorites, and watch streaming trailers.",
      type: "WEBSITE",
      url: "https://alexmoviesearch.vercel.app",
    },
    {
      id: "port-3",
      title: "E-commerce Website",
      description: "A complete electronic storefront featuring inventory admin panel, responsive cart drawer, and secure credit card checkout flow.",
      type: "CASE_STUDY",
      url: "https://medium.com/design-case-studies/ecommerce-checkout-redesign",
    },
    {
      id: "port-4",
      title: "AI Chatbot",
      description: "Next.js AI chat completion assistant using modern streaming models, customizable system instructions, and interactive conversation trees.",
      type: "GITHUB",
      url: "https://github.com/alexrivera/ai-chatbot",
    }
  ];

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    (initialData?.portfolioItems as PortfolioItem[]) || defaultPortfolioItems
  );

  // Modal helpers for adding experience, certification, portfolio
  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState<Omit<ExperienceItem, "id">>({
    title: "",
    company: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });

  const [showCertModal, setShowCertModal] = useState(false);
  const [newCert, setNewCert] = useState<Omit<CertificationItem, "id">>({
    name: "",
    issuer: "",
    year: new Date().getFullYear().toString(),
  });
  const [certFile, setCertFile] = useState<File | null>(null);

  const [showPortModal, setShowPortModal] = useState(false);
  const [newPort, setNewPort] = useState<Omit<PortfolioItem, "id">>({
    title: "",
    description: "",
    type: "IMAGE",
    url: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // File Upload Helper
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json();
      throw new Error(errData.error || "Failed to upload file");
    }

    const data = await uploadRes.json();
    return data.url;
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    setUploadProgress("Uploading photo...");
    try {
      const photoUrl = await uploadFile(file);
      setImage(photoUrl);
      setUploadProgress("Photo uploaded!");
    } catch (err: any) {
      alert(err.message || "Failed to upload photo");
      setUploadProgress(null);
    }
  };

  // Add Item actions
  const addExperience = () => {
    if (!newExp.title || !newExp.company || !newExp.startDate) {
      alert("Please fill in Title, Company and Start Date.");
      return;
    }
    const item: ExperienceItem = {
      id: `exp-${Date.now()}`,
      ...newExp,
    };
    setExperience([...experience, item]);
    setNewExp({
      title: "",
      company: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    });
    setShowExpModal(false);
  };

  const addCertification = async () => {
    if (!newCert.name || !newCert.issuer) {
      alert("Please fill in certification name and issuer.");
      return;
    }
    setLoading(true);
    setUploadProgress("Uploading certification image...");
    try {
      let imageUrl = "";
      if (certFile) {
        imageUrl = await uploadFile(certFile);
      }
      const item: CertificationItem = {
        id: `cert-${Date.now()}`,
        name: newCert.name,
        issuer: newCert.issuer,
        year: newCert.year,
        imageUrl,
      };
      setCertifications([...certifications, item]);
      setNewCert({
        name: "",
        issuer: "",
        year: new Date().getFullYear().toString(),
      });
      setCertFile(null);
      setShowCertModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to add certification");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const addPortfolioItem = async () => {
    if (!newPort.title || !newPort.description) {
      alert("Please fill in Title and Description.");
      return;
    }

    setLoading(true);
    setUploadProgress("Processing portfolio item...");
    try {
      let finalUrl = newPort.url;
      let finalFileUrl = "";
      const uploadedUrls: string[] = [];

      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgress(`Uploading project screenshot ${i + 1} of ${selectedFiles.length}...`);
          const fileUrl = await uploadFile(selectedFiles[i]);
          uploadedUrls.push(fileUrl);
        }
        finalFileUrl = uploadedUrls[0];
        finalUrl = uploadedUrls[0];
      }

      const item: PortfolioItem = {
        id: `port-${Date.now()}`,
        title: newPort.title,
        description: newPort.description,
        type: newPort.type,
        url: newPort.type === "IMAGE" && uploadedUrls.length > 0 ? uploadedUrls[0] : finalUrl,
        fileUrl: finalFileUrl,
        images: uploadedUrls,
      };

      setPortfolioItems([...portfolioItems, item]);
      setNewPort({
        title: "",
        description: "",
        type: "IMAGE",
        url: "",
      });
      setSelectedFiles(null);
      setSelectedFilePreviews([]);
      setShowPortModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to add portfolio item");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const toggleBadge = (badge: string) => {
    if (verificationBadges.includes(badge)) {
      setVerificationBadges(verificationBadges.filter((b) => b !== badge));
    } else {
      setVerificationBadges([...verificationBadges, badge]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      let finalResumeUrl = resumeUrl;

      if (resumeFile) {
        setUploadProgress("Uploading resume...");
        finalResumeUrl = await uploadFile(resumeFile);
        setResumeUrl(finalResumeUrl);
      }

      await updateFreelancerProfile({
        name,
        image,
        bio,
        skills,
        experienceYears: Number(experienceYears),
        portfolioUrl: portfolioItems[0]?.url || "",
        resumeUrl: finalResumeUrl,
        professionalHeadline,
        experience,
        certifications,
        portfolioItems,
        responseTime,
        availabilityStatus,
        verificationBadges,
      });

      setMessage({ type: "success", text: "Freelancer Profile saved successfully! Rankings updated." });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: error.message || "Failed to save profile. Please check parameters." });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <ImageIcon className="h-5 w-5 text-indigo-500" />;
      case "VIDEO":
        return <Video className="h-5 w-5 text-amber-500" />;
      case "GITHUB":
        return <FileCode className="h-5 w-5 text-slate-800" />;
      case "WEBSITE":
        return <Globe className="h-5 w-5 text-emerald-600" />;
      case "CASE_STUDY":
        return <FileText className="h-5 w-5 text-sky-500" />;
      default:
        return <LinkIcon className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <Card className="p-8 w-full bg-white shadow-lg border border-slate-100 rounded-3xl space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {uploadProgress && (
        <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold animate-pulse flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-500" />
          {uploadProgress}
        </div>
      )}

      {/* Tabs Selector Navigation */}
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-slate-100 pb-2 mb-2 gap-2 whitespace-nowrap scroll-smooth md:flex-wrap md:overflow-x-visible md:pb-1.5 md:mb-0">
        {(["info", "skills", "experience", "certifications", "portfolio"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === tab
                ? "bg-[#002d59] text-white shadow-md shadow-[#002d59]/10"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {tab === "info" && "Profile Info"}
            {tab === "skills" && "Skills & Resume"}
            {tab === "experience" && "Work Experience"}
            {tab === "certifications" && "Certifications"}
            {tab === "portfolio" && "Portfolio Gallery"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: Profile Info */}
        {activeTab === "info" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-150/40 rounded-2xl">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-sky-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-[#002d59] text-2xl shadow-inner">
                  {image ? (
                    <img src={image} alt="Profile Photo" className="h-full w-full object-cover" />
                  ) : (
                    name ? name[0].toUpperCase() : "U"
                  )}
                </div>
                <label className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm cursor-pointer transition-transform hover:scale-105">
                  <Upload className="h-3.5 w-3.5 text-slate-650" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h4 className="text-xs font-bold text-slate-700">Profile Photo</h4>
                <p className="text-[10px] text-slate-550 leading-relaxed max-w-sm">
                  Upload a clear image file (PNG, JPG, WebP, SVG). Size limit: 5MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Jane Dev"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Professional Headline"
                placeholder="Senior Full Stack & AI Specialist"
                value={professionalHeadline}
                onChange={(e) => setProfessionalHeadline(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Bio / About Me</label>
              <textarea
                className="w-full min-h-[120px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                placeholder="Write a compelling summary about your software career..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Availability Status</label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer"
                >
                  <option value="AVAILABLE">🟢 Available for Hire (Immediate)</option>
                  <option value="BUSY">🟡 Busy / Limited availability</option>
                  <option value="UNAVAILABLE">🔴 Unavailable / Not looking</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Typical Response Time</label>
                <select
                  value={responseTime}
                  onChange={(e) => setResponseTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer"
                >
                  <option value="Within 1 hour">⚡ Within 1 hour</option>
                  <option value="Within 3 hours">🕒 Within 3 hours</option>
                  <option value="Within 12 hours">⏰ Within 12 hours</option>
                  <option value="Within 24 hours">📅 Within 24 hours</option>
                  <option value="Within a few days">💬 Within a few days</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 pt-1.5">
              <label className="block text-xs font-semibold text-slate-600">Verification Badges (Showcase)</label>
              <div className="flex flex-wrap gap-2.5">
                {["Identity Verified", "Top Rated", "Expert Developer", "Preferred Freelancer"].map((badge) => {
                  const isChecked = verificationBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => toggleBadge(badge)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-sky-50 border-sky-300 text-[#002d59] shadow-sm"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-350"
                      }`}
                    >
                      <CheckCircle className={`h-3.5 w-3.5 ${isChecked ? "text-sky-500 fill-sky-50" : "text-slate-300"}`} />
                      {badge}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Skills & Resume */}
        {activeTab === "skills" && (
          <div className="space-y-5">
            <Input
              label="Professional Skills (comma separated list)"
              placeholder="typescript, react, next.js, tailwind, node.js"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Years of Experience"
              type="number"
              min="0"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              disabled={loading}
            />

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-600">Resume / CV (PDF format)</label>
              {resumeUrl && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150/70 rounded-xl mb-1.5">
                  <span className="text-xs text-slate-600 font-semibold truncate max-w-[70%]">
                    Active CV: {resumeUrl.split("/").pop()}
                  </span>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#3ac0ff] hover:text-[#002d59] transition-colors flex items-center gap-1"
                  >
                    <span>View File</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type !== "application/pdf") {
                      alert("Only PDF files are allowed.");
                      e.target.value = "";
                      return;
                    }
                    setResumeFile(file);
                  }
                }}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Work Experience */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Career History Timeline</h4>
                <p className="text-[10px] text-slate-500">Provide past employment roles and responsibilities.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpModal(true)}
                className="px-3.5 py-1.5 text-[10px] font-bold text-[#002d59] hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Experience
              </button>
            </div>

            {/* Experience List */}
            <div className="space-y-3">
              {experience.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center p-6 bg-slate-50 rounded-2xl">
                  No experience entries added.
                </p>
              ) : (
                experience.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-start gap-4 hover:border-slate-200 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[#002d59]" />
                        <h4 className="text-xs font-bold text-[#002d59]">{item.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-650 font-medium">
                        {item.company} • <span className="italic">{item.startDate} to {item.current ? "Present" : item.endDate}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xl leading-relaxed">{item.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExperience(experience.filter((e) => e.id !== item.id))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Experience Modal Popup */}
            {showExpModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowExpModal(false)} />
                <div className="relative w-full max-w-md bg-white border border-slate-100 p-6 rounded-3xl z-10 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-sm font-bold text-[#002d59]">Add Work Experience</h3>

                  <div className="space-y-3.5">
                    <Input
                      label="Job Title"
                      placeholder="Senior React Developer"
                      value={newExp.title}
                      onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                    />
                    <Input
                      label="Company"
                      placeholder="Google Inc"
                      value={newExp.company}
                      onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Start Date (YYYY-MM)"
                        placeholder="2021-08"
                        value={newExp.startDate}
                        onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })}
                      />
                      <Input
                        label="End Date (YYYY-MM)"
                        placeholder="2023-12"
                        value={newExp.endDate}
                        disabled={newExp.current}
                        onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="currJob"
                        checked={newExp.current}
                        onChange={(e) => setNewExp({ ...newExp, current: e.target.checked, endDate: e.target.checked ? "" : newExp.endDate })}
                        className="rounded border-slate-300 focus:ring-[#002d59] h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="currJob" className="text-xs font-semibold text-slate-650 cursor-pointer">
                        Currently working here
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Role Description</label>
                      <textarea
                        className="w-full min-h-[90px] px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:border-[#002d59] focus:ring-[#002d59]/20"
                        placeholder="Detail key tech used and deliverables completed..."
                        value={newExp.description}
                        onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowExpModal(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addExperience}>
                      Add Entry
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Certifications */}
        {activeTab === "certifications" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Certificates & Awards</h4>
                <p className="text-[10px] text-slate-550">List professional credentials, qualifications, or badges.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCertModal(true)}
                className="px-3.5 py-1.5 text-[10px] font-bold text-[#002d59] hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Credential
              </button>
            </div>

            {/* Certs List */}
            <div className="space-y-3">
              {certifications.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center p-6 bg-slate-50 rounded-2xl">
                  No certifications listed.
                </p>
              ) : (
                certifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center gap-4 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {item.imageUrl ? (
                        <div className="h-10 w-10 border border-slate-200 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer">
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
                          <Award className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-[#002d59]">{item.name}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {item.issuer} • Issued {item.year}
                          {item.imageUrl && (
                            <a
                              href={item.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#3ac0ff] hover:text-[#002d59] font-bold ml-2 transition-colors inline-flex items-center gap-0.5"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCertifications(certifications.filter((c) => c.id !== item.id))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Cert Modal Popup */}
            {showCertModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCertModal(false)} />
                <div className="relative w-full max-w-md bg-white border border-slate-100 p-6 rounded-3xl z-10 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-sm font-bold text-[#002d59] border-b border-slate-100 pb-2">Add Certification</h3>

                  <div className="space-y-3.5">
                    <Input
                      label="Credential Name"
                      placeholder="Google Cloud Digital Leader"
                      value={newCert.name}
                      onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                    />
                    <Input
                      label="Issuer Organization"
                      placeholder="Google"
                      value={newCert.issuer}
                      onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                    />
                    <Input
                      label="Year Issued"
                      type="number"
                      min="2000"
                      max={new Date().getFullYear() + 2}
                      value={newCert.year}
                      onChange={(e) => setNewCert({ ...newCert, year: e.target.value })}
                    />
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Upload Certificate Badge / Image (Max 5MB)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCertFile(file);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={() => { setCertFile(null); setShowCertModal(false); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addCertification}>
                      Add Entry
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Portfolio Gallery */}
        {activeTab === "portfolio" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Portfolio Gallery Showcase</h4>
                <p className="text-[10px] text-slate-550">Showcase past work, code repositories, websites, and case studies.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPortModal(true)}
                className="px-3.5 py-1.5 text-[10px] font-bold text-[#002d59] hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Gallery Project
              </button>
            </div>

            {/* Portfolio Items list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 bg-white border border-slate-150/60 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-sky-200 transition-all group relative"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPortfolioIcon(item.type)}
                        <h4 className="text-xs font-extrabold text-[#002d59]">{item.title}</h4>
                      </div>
                      <Badge variant="neutral" className="text-[9px] uppercase px-1.5 py-0.5">
                        {item.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-550 leading-relaxed font-medium line-clamp-3">
                      {item.description}
                    </p>

                    {/* Display Grid of project images */}
                    {item.images && item.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {item.images.map((img: string, i: number) => (
                          <div key={i} className="aspect-video bg-white border border-slate-150 rounded-lg overflow-hidden h-10 relative">
                            <img src={img} alt="screenshot" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#3ac0ff] hover:text-[#002d59] transition-colors"
                      >
                        <span>View Project</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No link provided</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setPortfolioItems(portfolioItems.filter((p) => p.id !== item.id))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Portfolio Item Modal Popup */}
            {showPortModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedFiles(null); setSelectedFilePreviews([]); setShowPortModal(false); }} />
                <div className="relative w-full max-w-md bg-white border border-slate-100 p-6 rounded-3xl z-10 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                  <h3 className="text-sm font-bold text-[#002d59] border-b border-slate-100 pb-2">Add Portfolio Project</h3>

                  <div className="space-y-3.5">
                    <Input
                      label="Project Name / Title"
                      placeholder="Expense Tracker"
                      value={newPort.title}
                      onChange={(e) => setNewPort({ ...newPort, title: e.target.value })}
                    />

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Project Description</label>
                      <textarea
                        className="w-full min-h-[70px] px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:border-[#002d59] focus:ring-[#002d59]/20"
                        placeholder="Outline the core functionality and what technologies you used..."
                        value={newPort.description}
                        onChange={(e) => setNewPort({ ...newPort, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Portfolio Media Type</label>
                      <select
                        value={newPort.type}
                        onChange={(e) => { setNewPort({ ...newPort, type: e.target.value as any, url: "" }); setSelectedFiles(null); setSelectedFilePreviews([]); }}
                        className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer"
                      >
                        <option value="IMAGE">🖼️ Local Images Showcase (Multiple Uploads)</option>
                        <option value="VIDEO">🎥 Local Video Demo Showcase</option>
                        <option value="GITHUB">💻 GitHub Repository Link</option>
                        <option value="WEBSITE">🌐 Live Website URL</option>
                        <option value="CASE_STUDY">📝 Case Study / Article Link</option>
                      </select>
                    </div>

                    {newPort.type === "IMAGE" && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600">Upload Project Images (Screenshots)</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              setSelectedFiles(e.target.files);
                              const previews: string[] = [];
                              for (let i = 0; i < e.target.files.length; i++) {
                                previews.push(URL.createObjectURL(e.target.files[i]));
                              }
                              setSelectedFilePreviews(previews);
                            }
                          }}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                        />
                        {selectedFilePreviews.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {selectedFilePreviews.map((preview, index) => (
                              <div key={index} className="aspect-video border border-slate-200 rounded-xl overflow-hidden bg-white">
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {newPort.type === "VIDEO" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600">Upload Demo Video File (Max 20MB)</label>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            if (e.target.files) setSelectedFiles(e.target.files);
                          }}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                        />
                      </div>
                    )}

                    {newPort.type !== "IMAGE" && newPort.type !== "VIDEO" && (
                      <Input
                        label="Project URL"
                        placeholder="https://..."
                        value={newPort.url}
                        onChange={(e) => setNewPort({ ...newPort, url: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedFiles(null); setSelectedFilePreviews([]); setShowPortModal(false); }} disabled={loading}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addPortfolioItem} disabled={loading}>
                      {loading ? "Saving..." : "Add to Gallery"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" disabled={loading} className="cursor-pointer min-w-[150px]">
            {loading ? "Saving Profile..." : "Save Profile Settings"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
