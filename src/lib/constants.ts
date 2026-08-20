import type {
  ApplicationStatus,
  CompensationType,
  PaymentItemStatus,
  ProjectStatus,
  TaskStatus,
} from "./types";

/* ============================================================================
   CATALOGS (§7.1)
   ========================================================================= */

export const PROJECT_CATEGORIES = [
  "Software Engineering",
  "Data & AI",
  "Design & UX",
  "Marketing & Sales",
  "Product & Project Management",
  "Writing & Translation",
  "Admin & Support",
  "Finance & Accounting",
  "Legal",
  "Other",
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  "Software Engineering": [
    "Frontend Development",
    "Backend Development",
    "Full Stack Development",
    "Mobile Development",
    "DevOps & Cloud",
    "QA & Testing",
    "Blockchain",
  ],
  "Data & AI": [
    "Data Analysis",
    "Data Engineering",
    "Machine Learning",
    "Computer Vision",
    "NLP & LLM",
    "Business Intelligence",
  ],
  "Design & UX": [
    "Product Design",
    "UI Design",
    "UX Research",
    "Brand & Identity",
    "Motion & 3D",
    "Illustration",
  ],
  "Marketing & Sales": [
    "Performance Marketing",
    "SEO & Content",
    "Social Media",
    "Email & CRM",
    "Sales Development",
  ],
  "Product & Project Management": [
    "Product Management",
    "Project Management",
    "Scrum Master",
    "Business Analysis",
  ],
  "Writing & Translation": [
    "Technical Writing",
    "Copywriting",
    "Editing & Proofreading",
    "Translation",
  ],
  "Admin & Support": ["Virtual Assistance", "Customer Support", "Data Entry", "Operations"],
  "Finance & Accounting": ["Bookkeeping", "Financial Modelling", "Audit", "Tax"],
  Legal: ["Contract Law", "Compliance", "IP & Trademarks"],
  Other: ["General"],
};

export const DOMAINS = [
  "Software Engineering",
  "Data & AI",
  "Design & UX",
  "Marketing & Sales",
  "Product & Project Management",
  "Writing & Translation",
  "Admin & Support",
  "Finance & Accounting",
  "Legal",
  "Other",
] as const;

/** 46 supported ISO-4217 currencies (§3.2). */
export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
];

/** 13 screening round types. Only SCREENING_QUESTIONS is runnable (§7.1 step 4). */
export const ROUND_TYPE_CATALOG: {
  type: string;
  name: string;
  description: string;
  runnable: boolean;
}[] = [
  {
    type: "SCREENING_QUESTIONS",
    name: "Screening Questions",
    description: "Structured questions answered during the application.",
    runnable: true,
  },
  { type: "RESUME_SHORTLIST", name: "Resume Shortlist", description: "Manual CV review round.", runnable: false },
  { type: "PORTFOLIO_REVIEW", name: "Portfolio Review", description: "Reviewers score submitted work samples.", runnable: false },
  { type: "APTITUDE_TEST", name: "Aptitude Test", description: "Timed reasoning and numeracy assessment.", runnable: false },
  { type: "TECHNICAL_MCQ", name: "Technical MCQ", description: "Multiple-choice technical knowledge test.", runnable: false },
  { type: "CODING_ROUND", name: "Coding Round", description: "Live or take-home programming challenge.", runnable: false },
  { type: "TAKE_HOME_ASSIGNMENT", name: "Take-Home Assignment", description: "Scoped deliverable with a deadline.", runnable: false },
  { type: "CASE_STUDY", name: "Case Study", description: "Business or product scenario walkthrough.", runnable: false },
  { type: "VIDEO_INTERVIEW", name: "Video Interview", description: "Asynchronous recorded responses.", runnable: false },
  { type: "TECHNICAL_INTERVIEW", name: "Technical Interview", description: "Live technical panel.", runnable: false },
  { type: "CULTURE_FIT", name: "Culture Fit Interview", description: "Values and ways-of-working conversation.", runnable: false },
  { type: "MANAGERIAL_ROUND", name: "Managerial Round", description: "Hiring manager discussion.", runnable: false },
  { type: "FINAL_HR_ROUND", name: "Final HR Round", description: "Offer, expectations and onboarding.", runnable: false },
];

export const QUESTION_TYPES = [
  { value: "PARAGRAPH", label: "Paragraph answer" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "PORTFOLIO", label: "Portfolio link" },
  { value: "VIDEO_INTRO", label: "Video intro" },
  { value: "CODING_ASSESSMENT", label: "Coding assessment" },
  { value: "ASSIGNMENT", label: "Assignment" },
] as const;

export const NON_MONETARY_BENEFITS = [
  "Certificate of Completion",
  "Letter of Recommendation",
  "Mentorship",
  "Pre-placement Offer",
  "Portfolio Rights",
  "Equity / ESOP",
  "Learning Stipend",
  "Networking Access",
  "Flexible Hours",
  "Remote Work",
];

export const WORKING_DAYS_OPTIONS = ["5 Days/Week", "6 Days/Week", "Flexible days"];

export const TIMING_TYPE_OPTIONS = [
  "Full Time (8h/day)",
  "Part Time (4h/day)",
  "Hourly contract",
];

export const COMPANY_SIZES = [
  "1-10 employees",
  "10-50 employees",
  "50-200 employees",
  "200-500 employees",
  "500-1000 employees",
  "1000+ employees",
];

export const COMPANY_BENEFITS = [
  "Health Insurance",
  "Remote First",
  "Flexible Hours",
  "Learning Budget",
  "Equity",
  "Paid Time Off",
  "Home Office Stipend",
  "Wellness Programme",
  "Annual Retreat",
  "Parental Leave",
];

export const SKILL_LIBRARY = [
  "react", "next.js", "typescript", "javascript", "node.js", "python", "django",
  "figma", "ui design", "ux research", "prototyping", "design systems",
  "tailwind css", "graphql", "postgresql", "prisma", "aws", "docker", "kubernetes",
  "machine learning", "pytorch", "tensorflow", "data analysis", "sql", "pandas",
  "seo", "content strategy", "copywriting", "brand strategy", "performance marketing",
  "product management", "agile", "scrum", "roadmapping", "user testing",
  "react native", "flutter", "swift", "kotlin", "go", "rust", "java", "spring boot",
  "webflow", "framer", "after effects", "blender", "illustration", "3d modelling",
];

export const LANGUAGE_LEVELS = ["Native", "Fluent", "Conversational", "Basic"];

/* ============================================================================
   STATUS MAPS (§19.10 StatusIndicator)
   ========================================================================= */

export type Tone = "success" | "warning" | "error" | "info" | "neutral" | "brand";

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  OPEN: { label: "Open", tone: "success" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  COMPLETED: { label: "Completed", tone: "brand" },
  CLOSED: { label: "Closed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "error" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: Tone }
> = {
  PENDING: { label: "Pending", tone: "warning" },
  SHORTLISTED: { label: "Shortlisted", tone: "info" },
  REJECTED: { label: "Not selected", tone: "error" },
  HIRED: { label: "Hired", tone: "success" },
};

export const PAYMENT_STATUS_META: Record<PaymentItemStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Not funded", tone: "neutral" },
  FUNDED: { label: "Funded", tone: "info" },
  SUBMITTED: { label: "In review", tone: "warning" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "error" },
  APPROVED: { label: "Approved", tone: "success" },
  RELEASED: { label: "Released", tone: "brand" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const COMPENSATION_META: Record<
  CompensationType,
  { label: string; short: string; description: string }
> = {
  FIXED: {
    label: "Fixed Price",
    short: "Fixed",
    description: "One agreed total for the whole engagement.",
  },
  HOURLY: {
    label: "Hourly Rate",
    short: "Hourly",
    description: "Paid per approved hour, capped by a maximum.",
  },
  MILESTONE: {
    label: "Milestone Based",
    short: "Milestones",
    description: "Budget split across funded, reviewable stages.",
  },
  STIPEND: {
    label: "Stipend",
    short: "Stipend",
    description: "A recurring amount for a fixed number of periods.",
  },
  UNPAID: {
    label: "Non-monetary",
    short: "Unpaid",
    description: "No cash. Certificates, mentorship and other benefits.",
  },
};

/* ============================================================================
   KANBAN (§15.1)
   ========================================================================= */

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export const TASK_COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "TODO", label: "To Do", accent: "var(--color-text-muted)" },
  { status: "IN_PROGRESS", label: "In Progress", accent: "var(--color-info-fg)" },
  { status: "REVIEW", label: "Review", accent: "var(--color-warning-fg)" },
  { status: "DONE", label: "Done", accent: "var(--color-brand-active)" },
];

/* ============================================================================
   WORKSPACE TABS (§10.3) — exact ids, labels and order
   ========================================================================= */

export const WORKSPACE_TABS = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "milestones", label: "Funding / Payments", icon: "Sparkles" },
  { id: "tasks", label: "Tasks", icon: "CheckSquare" },
  { id: "deliverables", label: "Deliverables", icon: "Archive" },
  { id: "messages", label: "Chat", icon: "MessageSquare" },
  { id: "meetings", label: "Meetings", icon: "CalendarClock" },
  { id: "team", label: "Team", icon: "Users" },
] as const;

export type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"];

/* ============================================================================
   PIPELINE STAGES
   ========================================================================= */

export const PIPELINE_STAGES = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
  "Offer",
  "Hired",
] as const;

/* ============================================================================
   LIMITS (§11, §9)
   ========================================================================= */

export const MAX_ROLE_SLOTS = 100;
export const MAX_DAILY_HOURS = 16;
export const REVISION_CAP = 2;
export const DELIVERABLE_REVISION_CAP = 2;
export const MESSAGE_TTL_DAYS = 7;
export const MAX_SIZES = { image: 5, pdf: 5, video: 20 };

/* ============================================================================
   AI SCORE WEIGHTS (§21.10)
   ========================================================================= */

export const SCORE_WEIGHTS = {
  skillMatch: 0.5,
  experienceMatch: 0.2,
  ratingMatch: 0.15,
  completionRateMatch: 0.1,
  priorityMatch: 0.05,
};
