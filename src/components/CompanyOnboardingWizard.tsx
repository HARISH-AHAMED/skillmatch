"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitCompanyOnboarding } from "@/actions/workflowActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Building, User, FileCheck, Users, ShieldAlert, CheckCircle } from "lucide-react";
import { parseCompanyMetadata } from "@/lib/workflowHelpers";

interface CompanyOnboardingWizardProps {
  company: {
    id: string;
    companyName: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    location: string | null;
    verificationBadges: string[];
    companySize: string | null;
    foundedYear: number | null;
    missionVision: string | null;
    workCulture: string | null;
    hiringPhilosophy: string | null;
    benefits: string[];
  };
}

export function CompanyOnboardingWizard({ company }: CompanyOnboardingWizardProps) {
  const router = useRouter();
  const meta = parseCompanyMetadata(company.description);

  const [step, setStep] = useState(meta.onboardedStep || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Step 1: Business Verification
  const [legalName, setLegalName] = useState(meta.legalBusinessName || "");
  const [regNumber, setRegNumber] = useState(meta.registrationNumber || "");
  const [gst, setGst] = useState(meta.gstNumber || "");
  const [hq, setHq] = useState(meta.headquarters || "");
  const [companyEmail, setCompanyEmail] = useState(meta.companyEmail || "");
  const [businessPhone, setBusinessPhone] = useState(meta.businessPhone || "");

  // Step 2: Recruiter Profile & Company Info
  const [companyName, setCompanyName] = useState(company.companyName || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [designation, setDesignation] = useState("HR Manager");
  const [about, setAbout] = useState(company.description && !company.description.startsWith("{") ? company.description : "");
  const [mission, setMission] = useState(company.missionVision || "");
  const [culture, setCulture] = useState(company.workCulture || "");
  const [philosophy, setPhilosophy] = useState(company.hiringPhilosophy || "");
  const [benefitsList, setBenefitsList] = useState(company.benefits?.join(", ") || "Health Insurance, Paid Leaves, Flexible Hours");

  // Step 3: Document Verification
  const [bizCert, setBizCert] = useState("");
  const [govId, setGovId] = useState("");
  const [verifiedEmailCode, setVerifiedEmailCode] = useState("");

  // Step 4: Team Seats
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string; role: string; designation: string }[]>(
    meta.team?.map(t => ({ name: t.name, email: t.email, role: t.role, designation: t.designation })) || []
  );
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Recruiter");
  const [newMemberDesig, setNewMemberDesig] = useState("Talent Acquisition");

  // Handle Team member add
  const handleAddMember = () => {
    if (!newMemberName || !newMemberEmail) return;
    setTeamMembers([
      ...teamMembers,
      { name: newMemberName, email: newMemberEmail, role: newMemberRole, designation: newMemberDesig },
    ]);
    setNewMemberName("");
    setNewMemberEmail("");
  };

  const handleRemoveMember = (idx: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  };

  // Calculate Profile Completeness
  const calculateCompleteness = () => {
    let score = 0;
    if (legalName) score += 15;
    if (regNumber) score += 15;
    if (hq) score += 10;
    if (companyEmail) score += 10;
    if (about) score += 15;
    if (mission) score += 10;
    if (culture) score += 10;
    if (teamMembers.length > 0) score += 15;
    return score;
  };

  // Save Progress server action call
  const saveStepProgress = async (nextStep: number, isFinal: boolean = false) => {
    setError("");
    setLoading(true);

    try {
      await submitCompanyOnboarding({
        legalBusinessName: legalName,
        registrationNumber: regNumber,
        gstNumber: gst,
        headquarters: hq,
        companyEmail,
        businessPhone: `${countryCode} ${mobile}`,
        companyName,
        industry: company.industry || "Technology",
        website: company.website || "https://talentra.ai",
        location: company.location || hq || "India",
        companySize: company.companySize || "10-50 employees",
        foundedYear: company.foundedYear || 2024,
        aboutText: about,
        mission,
        workCulture: culture,
        hiringPhilosophy: philosophy,
        benefits: benefitsList.split(",").map(b => b.trim()).filter(Boolean),
        teamMembers: teamMembers,
        step: nextStep,
        completeOnboarding: isFinal,
      });

      if (isFinal) {
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setStep(nextStep);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update onboarding progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 text-left">
      {/* Header section with profile progress bar */}
      <div className="bg-white border border-[#E3E5EA] p-6 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#1A1D29]">Configure Your Business Hub</h1>
            <p className="text-xs text-[#5B6272] mt-1 font-normal">Host jobs and recruit top freelancers for free</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Completeness</span>
            <p className="text-xl font-semibold text-[#1A1D29]">{calculateCompleteness()}%</p>
          </div>
        </div>

        {/* Multi-step indicator bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { id: 1, label: "Business Verification", icon: Building },
            { id: 2, label: "Recruiter Profile", icon: User },
            { id: 3, label: "Verification Documents", icon: FileCheck },
            { id: 4, label: "Team Seats", icon: Users },
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.id;
            const isPassed = step > s.id;
            return (
              <div key={s.id} className="space-y-1">
                <div className={`h-1.5 rounded-lg transition-all duration-300 ${
                  isPassed ? "bg-[#152C55]" : isCurrent ? "bg-[#152C55]" : "bg-[#E8F1FE]"
                }`} />
                <div className="hidden sm:flex items-center gap-1 mt-1 text-[11px] font-medium text-[#5B6272]">
                  <Icon className="h-3 w-3" />
                  <span>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-[#FDEAEA] border border-[#F5C2C2] rounded-lg text-[#BC2A2A] text-xs font-medium flex items-start gap-2">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {success && (
        <Card className="p-8 text-center bg-white border border-[#E3E5EA] rounded-lg space-y-3">
          <div className="p-3 bg-[#F8F9FB] text-[#1A1D29] rounded-lg w-fit mx-auto border border-[#E3E5EA]">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1D29]">Onboarding Completed!</h3>
          <p className="text-xs text-[#5B6272]">Your Recruiter and Business profile is now verified. Unlocking your Dashboard...</p>
        </Card>
      )}

      {!success && (
        <Card className="p-8 bg-white border border-[#C7CBD6] rounded-lg">
          {/* Step 1: Business Verification */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
                Step 1: Business Registry Verification
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Legal Business Name *"
                  placeholder="e.g. Acme Technologies Private Limited"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Business Registration Number *"
                  placeholder="e.g. CIN-U72900DL2024PTC12345"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="GST Number (Optional)"
                  placeholder="e.g. 07AAAAA1111A1Z1"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Headquarters Location *"
                  placeholder="e.g. New Delhi, Delhi, India"
                  value={hq}
                  onChange={(e) => setHq(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Official Company Email *"
                  type="email"
                  placeholder="e.g. contact@acme.com"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Official Website URL"
                  placeholder="e.g. https://acme.com"
                  value={company.website || ""}
                  disabled={true}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    if (!legalName || !regNumber || !hq || !companyEmail) {
                      setError("Please fill in all required fields.");
                      return;
                    }
                    saveStepProgress(2);
                  }}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Recruiter Profile & Company Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
                Step 2: Recruiter Profile & Company Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Recruiter First Name *"
                  placeholder="e.g. Harish"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Recruiter Last Name *"
                  placeholder="e.g. Ahamed"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />

                <div className="space-y-1.5 col-span-1">
                  <label className="block text-xs font-semibold text-[#5B6272]">Mobile Number *</label>
                  <div className="flex gap-2">
                    <select
                      className="px-2 py-2.5 rounded-md text-sm bg-white border border-[#E3E5EA] focus:outline-none"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={loading}
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <input
                      type="text"
                      className="flex-grow px-4 py-2.5 rounded-md text-sm bg-white border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <Select
                  label="Your Designation *"
                  options={[
                    { value: "HR Manager", label: "HR Manager" },
                    { value: "Talent Acquisition Lead", label: "Talent Acquisition Lead" },
                    { value: "Recruiting Coordinator", label: "Recruiting Coordinator" },
                    { value: "Founder / CEO", label: "Founder / CEO" },
                  ]}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  disabled={loading}
                />

                <Input
                  label="Display Organisation Name *"
                  placeholder="e.g. Acme Tech"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#5B6272]">About Company</label>
                <textarea
                  className="w-full min-h-[90px] px-4 py-2.5 rounded-md text-sm bg-white border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20"
                  placeholder="Tell potential candidates about your company mission and services..."
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Mission"
                  placeholder="e.g. Empower developers to create..."
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Work Culture Description"
                  placeholder="e.g. Hybrid, inclusive, feedback-driven"
                  value={culture}
                  onChange={(e) => setCulture(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Hiring Philosophy"
                  placeholder="e.g. Skills over degrees, fast execution"
                  value={philosophy}
                  onChange={(e) => setPhilosophy(e.target.value)}
                  disabled={loading}
                />
                <Input
                  label="Employee Benefits (comma-separated)"
                  placeholder="e.g. Health Insurance, Gym Allowance"
                  value={benefitsList}
                  onChange={(e) => setBenefitsList(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-4 justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="cursor-pointer">
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!firstName || !lastName || !mobile || !companyName) {
                      setError("Please fill in all recruiter fields.");
                      return;
                    }
                    saveStepProgress(3);
                  }}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Document Verification */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
                Step 3: Upload Certificate of Incorporation & ID
              </h2>

              <p className="text-xs text-[#5B6272] font-semibold leading-relaxed">
                To prevent fraud and maintain the integrity of our freelancing network, all recruiters must provide a mock certificate of incorporation or tax certificate, and a representative government photo ID.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2 border-2 border-dashed border-[#E3E5EA] rounded-lg p-6 text-center bg-[#F8F9FB]/50 hover:bg-[#F8F9FB] transition-colors">
                  <span className="block text-xs font-bold text-[#5B6272]">Certificate of Incorporation *</span>
                  <p className="text-[11px] text-[#5B6272] mt-1">PDF, JPG, PNG up to 5MB</p>
                  <input
                    type="file"
                    className="hidden"
                    id="cert-file"
                    onChange={(e) => setBizCert(e.target.files?.[0]?.name || "certificate.pdf")}
                  />
                  <label
                    htmlFor="cert-file"
                    className="mt-4 inline-block px-4 py-2 bg-white border border-[#E3E5EA] text-xs font-semibold rounded-full cursor-pointer hover:bg-[#F8F9FB]"
                  >
                    {bizCert || "Choose File"}
                  </label>
                </div>

                <div className="space-y-2 border-2 border-dashed border-[#E3E5EA] rounded-lg p-6 text-center bg-[#F8F9FB]/50 hover:bg-[#F8F9FB] transition-colors">
                  <span className="block text-xs font-bold text-[#5B6272]">Representative Government ID *</span>
                  <p className="text-[11px] text-[#5B6272] mt-1">Passport, Aadhaar Card, or Driver's license</p>
                  <input
                    type="file"
                    className="hidden"
                    id="id-file"
                    onChange={(e) => setGovId(e.target.files?.[0]?.name || "goverment-id.png")}
                  />
                  <label
                    htmlFor="id-file"
                    className="mt-4 inline-block px-4 py-2 bg-white border border-[#E3E5EA] text-xs font-semibold rounded-full cursor-pointer hover:bg-[#F8F9FB]"
                  >
                    {govId || "Choose File"}
                  </label>
                </div>
              </div>

              <div className="bg-[#E8F1FE] border border-[#C7CBD6] rounded-lg p-4.5 space-y-3">
                <h4 className="text-xs font-bold text-[#1A1D29]">Verify Recruiter Email Code</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-digit code sent to company email"
                    value={verifiedEmailCode}
                    onChange={(e) => setVerifiedEmailCode(e.target.value)}
                    disabled={loading}
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVerifiedEmailCode("654321")}
                    className="h-[42px] cursor-pointer mt-1"
                  >
                    Send Mock OTP
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="cursor-pointer">
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!bizCert || !govId || !verifiedEmailCode) {
                      setError("Please upload required certificates and verify the email code.");
                      return;
                    }
                    saveStepProgress(4);
                  }}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Save & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Team Seats */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
                Step 4: Manage Team & Invite Recruiter Seats
              </h2>

              <p className="text-xs text-[#5B6272] font-semibold leading-relaxed">
                Add other recruiters, HR associates, or finance admins to your company account. Assign roles to lock down permissions.
              </p>

              {/* Add Team Member form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end p-4 bg-[#F8F9FB] rounded-lg border border-[#C7CBD6]/60">
                <Input
                  label="Member Name"
                  placeholder="Sarah Green"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
                <Input
                  label="Company Email"
                  placeholder="sarah@acme.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
                <Select
                  label="Enterprise Role"
                  options={[
                    { value: "Owner", label: "Owner" },
                    { value: "Admin", label: "Admin" },
                    { value: "Recruiter", label: "Recruiter" },
                    { value: "Finance", label: "Finance" },
                    { value: "Viewer", label: "Viewer" },
                  ]}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                />
                <Button type="button" onClick={handleAddMember} className="w-full h-[42px] cursor-pointer mt-1.5">
                  Invite Member
                </Button>
              </div>

              {/* Team list */}
              {teamMembers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider">Invited HR Seats</h3>
                  <div className="divide-y divide-[#E3E5EA] border border-[#E3E5EA]/80 rounded-lg overflow-hidden bg-white">
                    {teamMembers.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 text-xs">
                        <div>
                          <p className="font-bold text-[#1A1D29]">{m.name} <span className="font-normal text-[#5B6272]">({m.email})</span></p>
                          <p className="text-[11px] text-[#5B6272] mt-0.5">{m.designation || "HR Specialist"} • Role: <strong className="text-[#1A1D29]">{m.role}</strong></p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(idx)}
                          className="text-[11px] font-bold text-[#BC2A2A] hover:text-[#BC2A2A] cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)} disabled={loading} className="cursor-pointer">
                  Back
                </Button>
                <Button
                  onClick={() => saveStepProgress(4, true)}
                  disabled={loading}
                  className="cursor-pointer bg-[#14713D] hover:bg-[#14713D] text-white font-bold"
                >
                  {loading ? "Completing Profile..." : "Complete Setup & Launch Dashboard"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
