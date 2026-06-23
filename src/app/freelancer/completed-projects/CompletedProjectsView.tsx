"use client";

import React, { useState } from "react";
import { updateFreelancerProfile } from "@/actions/profileActions";
import { submitCompanyReview } from "@/actions/reviewActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Briefcase,
  Star,
  Award,
  ExternalLink,
  Plus,
  Trash2,
  FolderOpen,
  Video,
  Image as ImageIcon,
  Globe,
  FileCode,
  FileText,
  Link as LinkIcon,
  Sparkles,
  X,
  Upload,
  CheckCircle2,
  Pencil
} from "lucide-react";

interface CompletedProjectsViewProps {
  freelancer: {
    id: string;
    userId: string;
    bio: string | null;
    skills: string[];
    experienceYears: number;
    portfolioUrl: string | null;
    resumeUrl: string | null;
    professionalHeadline?: string | null;
    experience?: any;
    certifications?: any;
    portfolioItems?: any;
    responseTime?: string | null;
    availabilityStatus?: string | null;
    verificationBadges?: string[];
  };
  completedProjects: any[];
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: "IMAGE" | "VIDEO" | "GITHUB" | "WEBSITE" | "CASE_STUDY";
  url?: string;
  fileUrl?: string; // main/legacy
  images?: string[]; // multi-image list
  liveLink?: string | null;
}

export function CompletedProjectsView({ freelancer, completedProjects }: CompletedProjectsViewProps) {
  const [activeTab, setActiveTab] = useState<"platform" | "portfolio">("platform");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    (freelancer.portfolioItems as PortfolioItem[]) || []
  );

  // States for Freelancer reviewing Client (Company)
  const [selectedReviewProject, setSelectedReviewProject] = useState<any | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComm, setReviewComm] = useState(5);
  const [reviewPayment, setReviewPayment] = useState(5);
  const [reviewClarity, setReviewClarity] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleCompanyReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewProject || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await submitCompanyReview(
        selectedReviewProject.id,
        selectedReviewProject.companyId,
        reviewRating,
        reviewComment,
        reviewComm,
        reviewPayment,
        reviewClarity
      );

      if (res.success) {
        alert("Review submitted successfully!");
        setSelectedReviewProject(null);
        setReviewComment("");
        setReviewRating(5);
        setReviewComm(5);
        setReviewPayment(5);
        setReviewClarity(5);
        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Modal adding state
  const [showPortModal, setShowPortModal] = useState(false);
  const [newPort, setNewPort] = useState<Omit<PortfolioItem, "id">>({
    title: "",
    description: "",
    type: "IMAGE",
    url: "",
    images: [],
    liveLink: null,
  });

  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Multi-image selection files
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
      
      // Generate object URL previews
      const previews: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        previews.push(URL.createObjectURL(e.target.files[i]));
      }
      setSelectedFilePreviews(previews);
    }
  };

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

  const formatLink = (url: string | null | undefined): string | null => {
    if (!url || !url.trim()) return null;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPort.title || !newPort.description) {
      alert("Please enter a title and description.");
      return;
    }

    setLoading(true);
    setUploadProgress("Uploading files...");
    setMessage(null);

    try {
      const uploadedUrls: string[] = [];

      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgress(`Uploading project screenshot ${i + 1} of ${selectedFiles.length}...`);
          const fileUrl = await uploadFile(selectedFiles[i]);
          uploadedUrls.push(fileUrl);
        }
      }

      const formattedLiveLink = formatLink(newPort.liveLink);

      const newItem: PortfolioItem = {
        id: `port-${Date.now()}`,
        title: newPort.title,
        description: newPort.description,
        type: newPort.type,
        liveLink: formattedLiveLink,
        url: newPort.url || formattedLiveLink || "",
        fileUrl: uploadedUrls[0] || "",
        images: uploadedUrls,
      };

      const updatedPortfolio = [newItem, ...portfolioItems];
      setPortfolioItems(updatedPortfolio);

      // Save to database
      setUploadProgress("Updating database profile...");
      await updateFreelancerProfile({
        bio: freelancer.bio || "",
        skills: freelancer.skills,
        experienceYears: freelancer.experienceYears,
        resumeUrl: freelancer.resumeUrl || "",
        professionalHeadline: freelancer.professionalHeadline || "",
        experience: freelancer.experience,
        certifications: freelancer.certifications,
        portfolioItems: updatedPortfolio,
        responseTime: freelancer.responseTime || "Within 24 hours",
        availabilityStatus: freelancer.availabilityStatus || "AVAILABLE",
        verificationBadges: freelancer.verificationBadges,
      });

      setMessage({ type: "success", text: "Portfolio project added successfully!" });
      
      // Reset State
      setNewPort({ title: "", description: "", type: "IMAGE", url: "", images: [], liveLink: null });
      setSelectedFiles(null);
      setSelectedFilePreviews([]);
      setShowPortModal(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to save project. Please try again." });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleEditPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title || !editingItem.description) {
      alert("Please enter a title and description.");
      return;
    }

    setLoading(true);
    setUploadProgress("Saving changes...");
    setMessage(null);

    try {
      let finalImages = editingItem.images || [];
      let finalFileUrl = editingItem.fileUrl || "";

      // If new files were selected, upload them
      if (selectedFiles && selectedFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgress(`Uploading file ${i + 1} of ${selectedFiles.length}...`);
          const fileUrl = await uploadFile(selectedFiles[i]);
          uploadedUrls.push(fileUrl);
        }
        finalImages = uploadedUrls;
        finalFileUrl = uploadedUrls[0];
      }

      const formattedLiveLink = formatLink(editingItem.liveLink);

      const updatedItem: PortfolioItem = {
        ...editingItem,
        liveLink: formattedLiveLink,
        url: editingItem.url || formattedLiveLink || "",
        fileUrl: finalFileUrl,
        images: finalImages,
      };

      const updatedPortfolio = portfolioItems.map((item) =>
        item.id === editingItem.id ? updatedItem : item
      );

      setPortfolioItems(updatedPortfolio);

      // Save to database
      setUploadProgress("Updating database profile...");
      await updateFreelancerProfile({
        bio: freelancer.bio || "",
        skills: freelancer.skills,
        experienceYears: freelancer.experienceYears,
        resumeUrl: freelancer.resumeUrl || "",
        professionalHeadline: freelancer.professionalHeadline || "",
        experience: freelancer.experience,
        certifications: freelancer.certifications,
        portfolioItems: updatedPortfolio,
        responseTime: freelancer.responseTime || "Within 24 hours",
        availabilityStatus: freelancer.availabilityStatus || "AVAILABLE",
        verificationBadges: freelancer.verificationBadges,
      });

      setMessage({ type: "success", text: "Portfolio project updated successfully!" });
      
      // Reset State
      setEditingItem(null);
      setSelectedFiles(null);
      setSelectedFilePreviews([]);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to save changes." });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio project?")) return;

    setLoading(true);
    setMessage(null);

    try {
      const updatedPortfolio = portfolioItems.filter((item) => item.id !== id);
      setPortfolioItems(updatedPortfolio);

      await updateFreelancerProfile({
        bio: freelancer.bio || "",
        skills: freelancer.skills,
        experienceYears: freelancer.experienceYears,
        resumeUrl: freelancer.resumeUrl || "",
        professionalHeadline: freelancer.professionalHeadline || "",
        experience: freelancer.experience,
        certifications: freelancer.certifications,
        portfolioItems: updatedPortfolio,
        responseTime: freelancer.responseTime || "Within 24 hours",
        availabilityStatus: freelancer.availabilityStatus || "AVAILABLE",
        verificationBadges: freelancer.verificationBadges,
      });

      setMessage({ type: "success", text: "Portfolio project removed successfully!" });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to delete project." });
    } finally {
      setLoading(false);
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
        return <LinkIcon className="h-5 w-5 text-slate-450" />;
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="p-3 bg-sky-50 border border-sky-200 text-sky-850 rounded-xl text-xs font-semibold animate-pulse flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-500" />
          {uploadProgress}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 gap-4 pb-2">
        <button
          onClick={() => setActiveTab("platform")}
          className={`text-sm font-bold pb-2 transition-all cursor-pointer border-b-2 px-1 ${
            activeTab === "platform"
              ? "border-[#002d59] text-[#002d59]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Platform Completed Contracts ({completedProjects.length})
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`text-sm font-bold pb-2 transition-all cursor-pointer border-b-2 px-1 ${
            activeTab === "portfolio"
              ? "border-[#002d59] text-[#002d59]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Portfolio Gallery Projects ({portfolioItems.length})
        </button>
      </div>

      {/* Platform Gigs Content */}
      {activeTab === "platform" && (
        <div className="space-y-4">
          {completedProjects.length === 0 ? (
            <Card className="p-10 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-2xl">
              <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              No contracts completed on the Talentra platform yet.
            </Card>
          ) : (
            completedProjects.map((project) => {
              const reviewOfFreelancer = project.reviews.find((r: any) => r.revieweeId === freelancer.userId);
              const reviewOfCompany = project.reviews.find((r: any) => r.reviewerId === freelancer.userId);

              return (
                <Card key={project.id} className="p-6 bg-white border border-slate-100/80 shadow-sm rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-extrabold text-[#002d59]">{project.title}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Completed for: <strong className="text-slate-800">{project.company.companyName}</strong> • Budget: <strong>${project.budget}</strong>
                      </p>
                    </div>
                    <Badge variant="success">Platform Completed</Badge>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {project.description.length > 250 ? `${project.description.slice(0, 250)}...` : project.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Display Client's review of Freelancer */}
                    {reviewOfFreelancer ? (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Client Review of You
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                            {Array.from({ length: reviewOfFreelancer.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-650 italic font-medium leading-relaxed">
                          &quot;{reviewOfFreelancer.comment}&quot;
                        </p>
                        <p className="text-[10px] text-slate-400 text-right">— {reviewOfFreelancer.reviewer.name}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center flex flex-col justify-center py-6">
                        <p className="text-slate-400 text-xs font-medium">Client hasn't reviewed you yet.</p>
                      </div>
                    )}

                    {/* Display Freelancer's review of Client */}
                    {reviewOfCompany ? (
                      <div className="p-4 bg-[#f8faff] border border-sky-100 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#002d59] uppercase tracking-widest flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" /> Your Review of Client
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                            {Array.from({ length: reviewOfCompany.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-650 italic font-medium leading-relaxed">
                          &quot;{reviewOfCompany.comment}&quot;
                        </p>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                          <span>Comm: {reviewOfCompany.communicationScore || 5}/5</span>
                          <span>Payment: {reviewOfCompany.paymentReliabilityScore || 5}/5</span>
                          <span>Clarity: {reviewOfCompany.projectClarityScore || 5}/5</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-sky-50/30 border border-dashed border-[#3ac0ff]/30 rounded-2xl text-center flex flex-col justify-center items-center py-6 gap-2">
                        <p className="text-slate-500 text-xs font-semibold">Share your feedback about the client!</p>
                        <Button
                          size="sm"
                          onClick={() => setSelectedReviewProject(project)}
                          className="cursor-pointer text-xs"
                        >
                          Review Client
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Portfolio Gallery Projects Content */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#002d59]">Portfolio Project Showcase</h3>
              <p className="text-xs text-slate-500">Showcase screenshots, repositories, and custom project highlights.</p>
            </div>
            <Button
              type="button"
              onClick={() => setShowPortModal(true)}
              size="sm"
              className="whitespace-nowrap shrink-0 gap-1.5 px-4 py-2 cursor-pointer text-xs flex items-center justify-center font-bold bg-[#002d59] text-white hover:bg-[#003f7a] transition-all duration-200 shadow-sm shadow-[#002d59]/10 rounded-xl"
            >
              <Plus className="h-4 w-4" /> Add Portfolio Item
            </Button>
          </div>

          {portfolioItems.length === 0 ? (
            <Card className="p-10 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-2xl">
              <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              No custom portfolio items created yet. Add one above!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolioItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-6 bg-white border border-slate-150/70 shadow-sm rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPortfolioIcon(item.type)}
                        <h4 className="text-sm font-extrabold text-[#002d59]">{item.title}</h4>
                      </div>
                      <Badge variant="neutral" className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5">
                        {item.type.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-550 leading-relaxed font-medium line-clamp-3">
                      {item.description}
                    </p>

                    {/* Display Grid of project images */}
                    {item.images && item.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {item.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setZoomedImage(imgUrl)}
                            className="aspect-video bg-white border border-slate-150 rounded-xl overflow-hidden cursor-zoom-in group-hover:border-sky-300 transition-colors relative"
                          >
                            <img src={imgUrl} alt={`${item.title} screenshot ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                          </div>
                        ))}
                      </div>
                    ) : item.fileUrl ? (
                      /* Fallback/Legacy image display */
                      item.type === "IMAGE" && (
                        <div
                          onClick={() => setZoomedImage(item.fileUrl!)}
                          className="aspect-video bg-white border border-slate-150 rounded-xl overflow-hidden cursor-zoom-in relative mt-2"
                        >
                          <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                      )
                    ) : null}

                    {/* Legacy video player display */}
                    {item.type === "VIDEO" && item.fileUrl && (
                      <div className="bg-black border border-slate-900 rounded-xl overflow-hidden aspect-video mt-2">
                        <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3.5 border-t border-slate-100 mt-2">
                    <div className="flex flex-wrap gap-3">
                      {item.liveLink ? (
                        <a
                          href={item.liveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-[#002d59] font-extrabold transition-colors"
                        >
                          <span>Live Demo</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}

                      {item.url && item.url !== item.liveLink ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#3ac0ff] hover:text-[#002d59] font-extrabold transition-colors"
                        >
                          <span>
                            {item.type === "GITHUB" ? "View Code" : "Open Link"}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}

                      {!item.liveLink && !item.url ? (
                        <span className="text-[10px] text-slate-400 italic font-medium">No links available</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={loading}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add Portfolio Project modal popup with MULTI-IMAGE support */}
          {showPortModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPortModal(false)} />
              <div className="relative w-full max-w-lg bg-white border border-slate-100 p-6 rounded-3xl z-10 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-[#002d59] border-b border-slate-100 pb-2">Add Completed Portfolio Project</h3>

                <form onSubmit={handleAddPortfolioItem} className="space-y-4">
                  <Input
                    label="Project Title"
                    placeholder="Expense Tracker"
                    value={newPort.title}
                    onChange={(e) => setNewPort({ ...newPort, title: e.target.value })}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Project Description</label>
                    <textarea
                      className="w-full min-h-[90px] px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:border-[#002d59] focus:ring-[#002d59]/20"
                      placeholder="Outline what features this project has and how you built it..."
                      value={newPort.description}
                      onChange={(e) => setNewPort({ ...newPort, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Project Type</label>
                    <select
                      value={newPort.type}
                      onChange={(e) => setNewPort({ ...newPort, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer"
                    >
                      <option value="IMAGE">🖼️ Local Images Showcase (Multiple Uploads)</option>
                      <option value="VIDEO">🎥 Local Video Demo Showcase</option>
                      <option value="GITHUB">💻 GitHub Repository Project</option>
                      <option value="WEBSITE">🌐 Live Deploy Website</option>
                      <option value="CASE_STUDY">📝 Research Case Study</option>
                    </select>
                  </div>

                  {newPort.type === "IMAGE" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-600">Upload Project Images (Screenshots)</label>
                      <div className="flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-350 p-6 rounded-2xl bg-slate-50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="text-center space-y-1">
                          <Upload className="h-6 w-6 text-slate-400 mx-auto group-hover:scale-105 transition-transform" />
                          <p className="text-[10px] font-bold text-slate-600 uppercase">Select project files</p>
                          <p className="text-[9px] text-slate-400 font-semibold">Upload multiple screenshots (Max 5MB each)</p>
                        </div>
                      </div>

                      {/* Display image previews selected */}
                      {selectedFilePreviews.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Upload Previews ({selectedFilePreviews.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {selectedFilePreviews.map((preview, index) => (
                              <div key={index} className="aspect-video border border-slate-200 rounded-xl overflow-hidden bg-white relative">
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
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
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800"
                        required
                      />
                    </div>
                  )}

                  <Input
                    label="Live Project Link (Optional)"
                    placeholder="https://example.com"
                    value={newPort.liveLink || ""}
                    onChange={(e) => setNewPort({ ...newPort, liveLink: e.target.value || null })}
                  />

                  {newPort.type !== "IMAGE" && newPort.type !== "VIDEO" && (
                    <Input
                      label="Repository or Website URL (Optional)"
                      placeholder="https://..."
                      value={newPort.url}
                      onChange={(e) => setNewPort({ ...newPort, url: e.target.value })}
                    />
                  )}

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFiles(null);
                        setSelectedFilePreviews([]);
                        setShowPortModal(false);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? "Uploading & Saving..." : "Add to Gallery"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Edit Portfolio Project modal popup */}
          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedFiles(null); setSelectedFilePreviews([]); setEditingItem(null); }} />
              <div className="relative w-full max-w-lg bg-white border border-slate-100 p-6 rounded-3xl z-10 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-[#002d59] border-b border-slate-100 pb-2">Edit Completed Portfolio Project</h3>

                <form onSubmit={handleEditPortfolioItem} className="space-y-4">
                  <Input
                    label="Project Title"
                    placeholder="Expense Tracker"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Project Description</label>
                    <textarea
                      className="w-full min-h-[90px] px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:border-[#002d59] focus:ring-[#002d59]/20"
                      placeholder="Outline what features this project has and how you built it..."
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Project Type</label>
                    <select
                      value={editingItem.type}
                      onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer"
                    >
                      <option value="IMAGE">🖼️ Local Images Showcase (Multiple Uploads)</option>
                      <option value="VIDEO">🎥 Local Video Demo Showcase</option>
                      <option value="GITHUB">💻 GitHub Repository Project</option>
                      <option value="WEBSITE">🌐 Live Deploy Website</option>
                      <option value="CASE_STUDY">📝 Research Case Study</option>
                    </select>
                  </div>

                  <Input
                    label="Live Project Link (Optional)"
                    placeholder="https://example.com"
                    value={editingItem.liveLink || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, liveLink: e.target.value || null })}
                  />

                  {editingItem.type !== "IMAGE" && editingItem.type !== "VIDEO" && (
                    <Input
                      label="Repository or Website URL (Optional)"
                      placeholder="https://..."
                      value={editingItem.url || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                    />
                  )}

                  {editingItem.type === "IMAGE" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-600">Upload New Project Images (Replaces existing)</label>
                      <div className="flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-350 p-6 rounded-2xl bg-slate-50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="text-center space-y-1">
                          <Upload className="h-6 w-6 text-slate-400 mx-auto group-hover:scale-105 transition-transform" />
                          <p className="text-[10px] font-bold text-slate-600 uppercase">Select project files</p>
                          <p className="text-[9px] text-slate-400 font-semibold">Upload multiple screenshots (Max 5MB each)</p>
                        </div>
                      </div>

                      {selectedFilePreviews.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Upload Previews ({selectedFilePreviews.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {selectedFilePreviews.map((preview, index) => (
                              <div key={index} className="aspect-video border border-slate-200 rounded-xl overflow-hidden bg-white relative">
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : editingItem.images && editingItem.images.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Current Images ({editingItem.images.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {editingItem.images.map((imgUrl, index) => (
                              <div key={index} className="aspect-video border border-slate-200 rounded-xl overflow-hidden bg-white relative">
                                <img src={imgUrl} alt="existing" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {editingItem.type === "VIDEO" && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Upload New Demo Video File (Max 20MB, Optional)</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files) setSelectedFiles(e.target.files);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFiles(null);
                        setSelectedFilePreviews([]);
                        setEditingItem(null);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? "Saving Changes..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Image zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setZoomedImage(null)} />
          <div className="relative max-w-4xl max-h-[85vh] bg-white border border-slate-100 rounded-3xl p-3 z-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={zoomedImage} alt="Expanded preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* Review Client Modal */}
      {selectedReviewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedReviewProject(null)}
          />

          <Card className="relative w-full max-w-lg p-8 z-10 border-slate-100 bg-white shadow-2xl overflow-y-auto max-h-[90vh] rounded-3xl">
            <button
              onClick={() => setSelectedReviewProject(null)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-[#002d59] mb-1">Review Client</h3>
            <p className="text-xs text-slate-500 mb-6 font-semibold">
              Project: <span className="text-[#002d59]">{selectedReviewProject.title}</span> • Company: <span className="text-[#002d59]">{selectedReviewProject.company.companyName}</span>
            </p>

            <form onSubmit={handleCompanyReviewSubmit} className="space-y-4">
              {/* Overall Rating */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Overall Rating ({reviewRating} Stars)</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`h-7 w-7 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-350"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-ratings */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1 text-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Communication</label>
                  <select
                    value={reviewComm}
                    onChange={(e) => setReviewComm(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white cursor-pointer text-slate-800"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Speed</label>
                  <select
                    value={reviewPayment}
                    onChange={(e) => setReviewPayment(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white cursor-pointer text-slate-800"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Project Clarity</label>
                  <select
                    value={reviewClarity}
                    onChange={(e) => setReviewClarity(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white cursor-pointer text-slate-800"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Review Comments</label>
                <textarea
                  className="w-full min-h-[100px] px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:border-[#002d59] focus:ring-[#002d59]/20"
                  placeholder="Describe your collaboration, payment promptness, communication clarity..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  disabled={submittingReview}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReviewProject(null)}
                  disabled={submittingReview}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submittingReview} className="cursor-pointer">
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
