"use client";

import React, { useState } from "react";
import { updateFreelancerProfile } from "@/actions/profileActions";
import { submitCompanyReview } from "@/actions/reviewActions";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyStateAstronaut, StipendChip } from "@/components/ui/AppBlocks";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import Link from "next/link";
import { fileToBase64 } from "@/lib/utils";
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
  Pencil, LayoutGrid, Table as TableIcon } from "lucide-react";
import { getProjectDescriptionText, formatProjectBudget, getProjectMetadataDirect, defaultCertificateConfig } from "@/lib/workflowHelpers";
import { CertificatePreview } from "@/components/CertificateConfigurator";

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
  certificates?: any[];
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

export function CompletedProjectsView({ freelancer, completedProjects, certificates = [] }: CompletedProjectsViewProps) {
  // #9 — card/table switch, reusing the pill Tabs pattern already used by
  // Review Applicants rather than introducing a second toggle style.
  const [projectView, setProjectView] = useState<"card" | "table">("card");
  const [activeTab, setActiveTab] = useState<"platform" | "portfolio" | "certificates">("platform");
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
    setUploadProgress("Processing files...");
    setMessage(null);

    try {
      const uploadedUrls: string[] = [];

      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgress(`Processing project screenshot ${i + 1} of ${selectedFiles.length}...`);
          const file = selectedFiles[i];
          const limit = newPort.type === "VIDEO" ? 3.0 : 1.5;
          const fileUrl = await fileToBase64(file, limit);
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

      // If new files were selected, process them
      if (selectedFiles && selectedFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgress(`Processing file ${i + 1} of ${selectedFiles.length}...`);
          const file = selectedFiles[i];
          const limit = editingItem.type === "VIDEO" ? 3.0 : 1.5;
          const fileUrl = await fileToBase64(file, limit);
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
        return <ImageIcon className="h-5 w-5 text-[#2159C9]" />;
      case "VIDEO":
        return <Video className="h-5 w-5 text-[#8F5E08]" />;
      case "GITHUB":
        return <FileCode className="h-5 w-5 text-[#1A1D29]" />;
      case "WEBSITE":
        return <Globe className="h-5 w-5 text-[#147A44]" />;
      case "CASE_STUDY":
        return <FileText className="h-5 w-5 text-[#2159C9]" />;
      default:
        return <LinkIcon className="h-5 w-5 text-[#5B6272]" />;
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg text-xs font-semibold border ${
            message.type === "success"
              ? "bg-[#E4F7EC] border-[#BFE9D2] text-[#147A44]"
              : "bg-[#FDEAEA] border-[#F5C2C2] text-[#BC2A2A]"
          }`}
        >
          {message.text}
        </div>
      )}

      {uploadProgress && (
        <div className="p-3 bg-[#E8F1FE] border border-[#C7CBD6] text-[#2159C9] rounded-lg text-xs font-semibold animate-pulse flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2159C9]" />
          {uploadProgress}
        </div>
      )}

      {/* Navigation tabs */}
      <Tabs
        label="Completed work views"
        value={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: "platform", label: "Platform Completed Contracts", count: completedProjects.length },
          { id: "portfolio", label: "Portfolio Gallery Projects", count: portfolioItems.length },
          { id: "certificates", label: "My Certificates", count: certificates.length },
        ]}
      />

      {/* Certificates earned across every completed contract */}
      {activeTab === "certificates" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {certificates.length === 0 ? (
            <Card className="p-10 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg lg:col-span-2">
              <Award className="h-8 w-8 text-[#2159C9] mx-auto mb-3" />
              
            </Card>
          ) : (
            certificates.map((cert: any) => (
              <Card
                key={cert.id}
                className="overflow-hidden border border-[#E3E5EA] bg-white p-0 rounded-lg transition-all hover:shadow-md"
              >
                {/* Certificate artwork preview */}
                {/* The real issued certificate, rendered small */}
                <div className="relative h-[210px] overflow-hidden bg-[#F8F9FB]">
                  <div className="pointer-events-none absolute left-0 top-0 w-[1000px] origin-top-left scale-[0.42]">
                    <CertificatePreview
                      config={getProjectMetadataDirect(cert.project?.description).certificate ?? defaultCertificateConfig()}
                      data={{
                        freelancerName: cert.recipientName,
                        projectName: cert.projectTitle,
                        role: cert.roleTitle,
                        skills: (cert.skills || []).slice(0, 6),
                        completionDate: new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                        certificateId: cert.publicId,
                        companyName: cert.issuerName,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#C7CBD6] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1A1D29]">{cert.projectTitle}</p>
                    <p className="truncate text-[11px] text-[#5B6272]">ID {cert.publicId}</p>
                  </div>
                  <a
                    href={`/freelancer/certificates/${cert.publicId}`}
                    className="shrink-0 rounded-full bg-[#152C55] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1E3D71]"
                  >
                    View Certificate
                  </a>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Platform Gigs Content */}
      {activeTab === "platform" && (
        <div className="space-y-4">
          {completedProjects.length > 0 && (
            <div className="flex justify-end">
              <Tabs
                label="Result layout"
                variant="pill"
                value={projectView}
                onChange={(id) => setProjectView(id as "card" | "table")}
                items={[
                  { id: "card", label: "Cards", icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
                  { id: "table", label: "Table", icon: <TableIcon className="h-3.5 w-3.5" aria-hidden="true" /> },
                ]}
              />
            </div>
          )}

          {/*
            Table mode carries the same facts as the cards — company, budget,
            certificate, and both review scores — so switching density never
            drops information.
          */}
          {projectView === "table" && completedProjects.length > 0 && (
            <Card className="overflow-hidden rounded-lg border-[#E3E5EA] bg-white">
              <div className="overflow-x-auto p-5">
                <Table className="w-full min-w-[820px] whitespace-nowrap">
                  <THead>
                    <TR>
                      <TH>Project</TH>
                      <TH>Company</TH>
                      <TH align="center">Budget</TH>
                      <TH align="center">Certificate</TH>
                      <TH align="center">Rating received</TH>
                      <TH align="center">Review given</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {completedProjects.map((project) => {
                      const received = project.reviews.find((r: any) => r.revieweeId === freelancer.userId);
                      const given = project.reviews.find((r: any) => r.reviewerId === freelancer.userId);
                      const cert = project.certificates?.[0];
                      return (
                        <TR key={project.id}>
                          <TD className="font-semibold text-[#1A1D29]">{project.title}</TD>
                          <TD>{project.company.companyName}</TD>
                          <TD align="center">{formatProjectBudget(project)}</TD>
                          <TD align="center">
                            {cert ? (
                              <Link
                                href={`/freelancer/certificates/${cert.publicId}`}
                                className="text-[11px] font-bold text-[#2159C9] hover:underline"
                              >
                                View
                              </Link>
                            ) : (
                              <span className="text-[11px] text-[#5B6272]">—</span>
                            )}
                          </TD>
                          <TD align="center">
                            {received ? (
                              <span className="text-[11px] font-semibold text-[#1A1D29]">{received.rating}/5</span>
                            ) : (
                              <span className="text-[11px] text-[#5B6272]">Pending</span>
                            )}
                          </TD>
                          <TD align="center">
                            {given ? (
                              <span className="text-[11px] font-semibold text-[#1A1D29]">{given.rating}/5</span>
                            ) : (
                              <span className="text-[11px] text-[#5B6272]">Not yet</span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </Card>
          )}
          {completedProjects.length === 0 ? (
            <Card className="p-10 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg">
              <Briefcase className="h-8 w-8 text-[#2159C9] mx-auto mb-3" />
              
            </Card>
          ) : (
            projectView === "card" && completedProjects.map((project) => {
              const reviewOfFreelancer = project.reviews.find((r: any) => r.revieweeId === freelancer.userId);
              const reviewOfCompany = project.reviews.find((r: any) => r.reviewerId === freelancer.userId);

              return (
                <Card key={project.id} className="overflow-hidden bg-white border border-[#E3E5EA]/80 rounded-lg">
                  {/* #9 — banner heads the card; projects without one keep a neutral placeholder. */}
                  {project.bannerUrl ? (
                    <img
                      src={project.bannerUrl}
                      alt=""
                      className="aspect-[16/5] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/5] w-full items-center justify-center bg-[#F0F3F9]">
                      <Briefcase className="h-6 w-6 text-[#5B6272]" />
                    </div>
                  )}
                  <div className="space-y-4 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-[#1A1D29]">{project.title}</h3>
                      <p className="text-xs text-[#5B6272] font-semibold mt-1">
                        Completed for: <strong className="text-[#1A1D29]">{project.company.companyName}</strong> • Budget: <strong>{formatProjectBudget(project)}</strong>
                      </p>
                    </div>
                    <Badge variant="success">Platform Completed</Badge>
                  </div>

                  {/* Certificate earned on this contract — easy to spot and act on */}
                  {project.certificates?.length > 0 && (
                    <div className="flex">
                      <a href={`/freelancer/certificates/${project.certificates[0].publicId}`} className="rounded-full bg-[#152C55] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1E3D71]">View Certificate</a>
                    </div>
                  )}

                  <p className="text-xs text-[#5B6272] leading-relaxed font-medium">
                    {(() => {
                      const cleanDesc = getProjectDescriptionText(project.description);
                      return cleanDesc.length > 250 ? `${cleanDesc.slice(0, 250)}...` : cleanDesc;
                    })()}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Display Client's review of Freelancer */}
                    {reviewOfFreelancer ? (
                      <div className="p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#147A44]" /> Client Review of You
                          </span>
                          <div className="flex items-center gap-0.5 text-[#8F5E08] text-xs">
                            {Array.from({ length: reviewOfFreelancer.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-[#B9790A] text-[#8F5E08]" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[#5B6272] italic font-medium leading-relaxed">
                          &quot;{reviewOfFreelancer.comment}&quot;
                        </p>
                        <p className="text-[11px] text-[#5B6272] text-right">— {reviewOfFreelancer.reviewer.name}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#F8F9FB]/50 border border-dashed border-[#E3E5EA] rounded-lg text-center flex flex-col justify-center py-6">
                        <p className="text-[#5B6272] text-xs font-medium">Client hasn't reviewed you yet.</p>
                      </div>
                    )}

                    {/* Display Freelancer's review of Client */}
                    {reviewOfCompany ? (
                      <div className="p-4 bg-[#F8F9FB] border border-[#C7CBD6] rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-[#1A1D29] uppercase tracking-widest flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-[#8F5E08] fill-[#B9790A]/20" /> Your Review of Client
                          </span>
                          <div className="flex items-center gap-0.5 text-[#8F5E08] text-xs">
                            {Array.from({ length: reviewOfCompany.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-[#B9790A] text-[#8F5E08]" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[#5B6272] italic font-medium leading-relaxed">
                          &quot;{reviewOfCompany.comment}&quot;
                        </p>
                        <div className="flex justify-between items-center text-[11px] text-[#5B6272] font-semibold pt-1 border-t border-[#E3E5EA]">
                          <span>Comm: {reviewOfCompany.communicationScore || 5}/5</span>
                          <span>Payment: {reviewOfCompany.paymentReliabilityScore || 5}/5</span>
                          <span>Clarity: {reviewOfCompany.projectClarityScore || 5}/5</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#E8F1FE]/30 border border-dashed border-[#C7CBD6]/30 rounded-lg text-center flex flex-col justify-center items-center py-6 gap-2">
                        <p className="text-[#5B6272] text-xs font-semibold">Share your feedback about the client!</p>
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
              <h3 className="text-sm font-bold text-[#1A1D29]">Portfolio Project Showcase</h3>
              <p className="text-xs text-[#5B6272]">Showcase screenshots, repositories, and custom project highlights.</p>
            </div>
            <Button
              type="button"
              onClick={() => setShowPortModal(true)}
              size="sm"
              className="whitespace-nowrap shrink-0 gap-1.5 px-4 py-2 cursor-pointer text-xs flex items-center justify-center font-bold bg-[#152C55] text-white hover:bg-[#EAF1FE] transition-all duration-200 shadow-[#152C55]/10 rounded-full"
            >
              <Plus className="h-4 w-4" /> Add Portfolio Item
            </Button>
          </div>

          {portfolioItems.length === 0 ? (
            <Card className="p-10 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg">
              <FolderOpen className="h-8 w-8 text-[#2159C9] mx-auto mb-3" />
              No custom portfolio items created yet. Add one above!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolioItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-6 bg-white border border-[#E3E5EA]/70 rounded-lg flex flex-col justify-between space-y-4 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPortfolioIcon(item.type)}
                        <h4 className="text-sm font-bold text-[#1A1D29]">{item.title}</h4>
                      </div>
                      <Badge variant="neutral" className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5">
                        {item.type.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#5B6272] leading-relaxed font-medium line-clamp-3">
                      {item.description}
                    </p>

                    {/* Display Grid of project images */}
                    {item.images && item.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {item.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setZoomedImage(imgUrl)}
                            className="aspect-video bg-white border border-[#E3E5EA] rounded-lg overflow-hidden cursor-zoom-in group-hover:border-[#C7CBD6] transition-colors relative"
                          >
                            <img src={imgUrl} alt={`${item.title} screenshot ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-300" />
                          </div>
                        ))}
                      </div>
                    ) : item.fileUrl ? (
                      /* Fallback/Legacy image display */
                      item.type === "IMAGE" && (
                        <div
                          onClick={() => setZoomedImage(item.fileUrl!)}
                          className="aspect-video bg-white border border-[#E3E5EA] rounded-lg overflow-hidden cursor-zoom-in relative mt-2"
                        >
                          <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                      )
                    ) : null}

                    {/* Legacy video player display */}
                    {item.type === "VIDEO" && item.fileUrl && (
                      <div className="bg-black border border-[#1A1D29] rounded-lg overflow-hidden aspect-video mt-2">
                        <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3.5 border-t border-[#E3E5EA] mt-2">
                    <div className="flex flex-wrap gap-3">
                      {item.liveLink ? (
                        <a
                          href={item.liveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#147A44] hover:text-[#1A1D29] font-bold transition-colors"
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
                          className="inline-flex items-center gap-1 text-xs text-[#2159C9] hover:text-[#1A1D29] font-bold transition-colors"
                        >
                          <span>
                            {item.type === "GITHUB" ? "View Code" : "Open Link"}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}

                      {!item.liveLink && !item.url ? (
                        <span className="text-[11px] text-[#5B6272] italic font-medium">No links available</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-[#5B6272] hover:bg-[#F8F9FB] rounded-full transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={loading}
                        className="p-1.5 text-[#BC2A2A] hover:bg-[#FDEAEA] rounded-full transition-colors cursor-pointer"
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
            <Modal open onClose={() => setShowPortModal(false)} size="xl" title="Add Completed Portfolio Project">
              <div className="space-y-4">

                <form onSubmit={handleAddPortfolioItem} className="space-y-4">
                  <Input
                    label="Project Title"
                    placeholder="Expense Tracker"
                    value={newPort.title}
                    onChange={(e) => setNewPort({ ...newPort, title: e.target.value })}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#5B6272]">Project Description</label>
                    <textarea
                      className="w-full min-h-[90px] px-3.5 py-2.5 rounded-md text-xs bg-white border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                      placeholder="Outline what features this project has and how you built it..."
                      value={newPort.description}
                      onChange={(e) => setNewPort({ ...newPort, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#5B6272]">Project Type</label>
                    <select
                      value={newPort.type}
                      onChange={(e) => setNewPort({ ...newPort, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20 cursor-pointer"
                    >
                      <option value="IMAGE">Local Images Showcase (Multiple Uploads)</option>
                      <option value="VIDEO">Local Video Demo Showcase</option>
                      <option value="GITHUB">GitHub Repository Project</option>
                      <option value="WEBSITE">Live Deploy Website</option>
                      <option value="CASE_STUDY">Research Case Study</option>
                    </select>
                  </div>

                  {newPort.type === "IMAGE" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#5B6272]">Upload Project Images (Screenshots)</label>
                      <div className="flex items-center justify-center border-2 border-dashed border-[#E3E5EA] hover:border-[#E3E5EA] p-6 rounded-lg bg-[#F8F9FB] transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="text-center space-y-1">
                          <Upload className="h-6 w-6 text-[#5B6272] mx-auto group- transition-transform" />
                          <p className="text-[11px] font-bold text-[#5B6272] uppercase">Select project files</p>
                          <p className="text-[11px] text-[#5B6272] font-semibold">Upload multiple screenshots (Max 5MB each)</p>
                        </div>
                      </div>

                      {/* Display image previews selected */}
                      {selectedFilePreviews.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-wide block">Upload Previews ({selectedFilePreviews.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {selectedFilePreviews.map((preview, index) => (
                              <div key={index} className="aspect-video border border-[#C7CBD6] rounded-lg overflow-hidden bg-white relative">
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
                      <label className="block text-xs font-semibold text-[#5B6272]">Upload Demo Video File (Max 20MB)</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files) setSelectedFiles(e.target.files);
                        }}
                        className="w-full px-4 py-2.5 rounded-md text-xs bg-white border border-[#E3E5EA] text-[#1A1D29]"
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

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E3E5EA]">
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
            </Modal>
          )}
          {/* Edit Portfolio Project modal popup */}
          {editingItem && (
            <Modal open onClose={() => { setSelectedFiles(null); setSelectedFilePreviews([]); setEditingItem(null); }} size="xl" title="Edit Completed Portfolio Project">
              <div className="space-y-4">

                <form onSubmit={handleEditPortfolioItem} className="space-y-4">
                  <Input
                    label="Project Title"
                    placeholder="Expense Tracker"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#5B6272]">Project Description</label>
                    <textarea
                      className="w-full min-h-[90px] px-3.5 py-2.5 rounded-md text-xs bg-white border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                      placeholder="Outline what features this project has and how you built it..."
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#5B6272]">Project Type</label>
                    <select
                      value={editingItem.type}
                      onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20 cursor-pointer"
                    >
                      <option value="IMAGE">Local Images Showcase (Multiple Uploads)</option>
                      <option value="VIDEO">Local Video Demo Showcase</option>
                      <option value="GITHUB">GitHub Repository Project</option>
                      <option value="WEBSITE">Live Deploy Website</option>
                      <option value="CASE_STUDY">Research Case Study</option>
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
                      <label className="block text-xs font-semibold text-[#5B6272]">Upload New Project Images (Replaces existing)</label>
                      <div className="flex items-center justify-center border-2 border-dashed border-[#C7CBD6] hover:border-[#E3E5EA] p-6 rounded-lg bg-[#F8F9FB] transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="text-center space-y-1">
                          <Upload className="h-6 w-6 text-[#5B6272] mx-auto group- transition-transform" />
                          <p className="text-[11px] font-bold text-[#5B6272] uppercase">Select project files</p>
                          <p className="text-[11px] text-[#5B6272] font-semibold">Upload multiple screenshots (Max 5MB each)</p>
                        </div>
                      </div>

                      {selectedFilePreviews.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-wide block">Upload Previews ({selectedFilePreviews.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {selectedFilePreviews.map((preview, index) => (
                              <div key={index} className="aspect-video border border-[#E3E5EA] rounded-lg overflow-hidden bg-white relative">
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : editingItem.images && editingItem.images.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-wide block">Current Images ({editingItem.images.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {editingItem.images.map((imgUrl, index) => (
                              <div key={index} className="aspect-video border border-[#E3E5EA] rounded-lg overflow-hidden bg-white relative">
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
                      <label className="block text-xs font-semibold text-[#5B6272]">Upload New Demo Video File (Max 20MB, Optional)</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files) setSelectedFiles(e.target.files);
                        }}
                        className="w-full px-4 py-2.5 rounded-md text-xs bg-white border border-[#E3E5EA] text-[#1A1D29]"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E3E5EA]">
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
            </Modal>
          )}
        </div>
      )}

      {/* Fullscreen image zoom — an image viewer, not a dialog: no header, no
          card chrome, sized to the image. Shares the system scrim but stays
          structurally separate from Modal. */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1A1D29]/50 cursor-zoom-out" onClick={() => setZoomedImage(null)} />
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            aria-label="Close image"
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1A1D29] transition-colors hover:bg-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={zoomedImage}
            alt="Expanded preview"
            className="relative z-10 max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* Review Client Modal */}
      {selectedReviewProject && (
        <Modal open onClose={() => setSelectedReviewProject(null)} size="xl" title="Review Client">
          <div className="space-y-4">
            <p className="text-xs text-[#5B6272] mb-6 font-semibold">
              Project: <span className="text-[#1A1D29]">{selectedReviewProject.title}</span> • Company: <span className="text-[#1A1D29]">{selectedReviewProject.company.companyName}</span>
            </p>

            <form onSubmit={handleCompanyReviewSubmit} className="space-y-4">
              {/* Overall Rating */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#5B6272]">Overall Rating ({reviewRating} Stars)</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-[#8F5E08] transition-transform cursor-pointer"
                    >
                      <Star className={`h-7 w-7 ${star <= reviewRating ? "fill-[#B9790A] text-[#8F5E08]" : "text-[#5B6272]"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-ratings */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#F8F9FB] rounded-lg border border-[#E3E5EA]">
                <div className="space-y-1 text-center">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Communication</label>
                  <select
                    value={reviewComm}
                    onChange={(e) => setReviewComm(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-md border border-[#E3E5EA] bg-white cursor-pointer text-[#1A1D29]"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Payment Speed</label>
                  <select
                    value={reviewPayment}
                    onChange={(e) => setReviewPayment(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-md border border-[#E3E5EA] bg-white cursor-pointer text-[#1A1D29]"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-center">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Project Clarity</label>
                  <select
                    value={reviewClarity}
                    onChange={(e) => setReviewClarity(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2 py-1 rounded-md border border-[#E3E5EA] bg-white cursor-pointer text-[#1A1D29]"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>{val} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#5B6272]">Review Comments</label>
                <textarea
                  className="w-full min-h-[100px] px-3.5 py-2.5 rounded-md text-xs bg-white border border-[#E3E5EA] text-[#1A1D29] focus:outline-none focus:ring-2 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20"
                  placeholder="Describe your collaboration, payment promptness, communication clarity..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  disabled={submittingReview}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-[#E3E5EA]">
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
          </div>
        </Modal>
      )}
    </div>
  );
}
