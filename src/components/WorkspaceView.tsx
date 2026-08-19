"use client";

import { WorkspaceFunding } from "@/components/WorkspaceFunding";
import { WorkspaceMeetings } from "@/components/WorkspaceMeetings";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { getProjectMetadataDirect as getProjMetaForFunding, formatCompensation, getCurrencySymbol } from "@/lib/workflowHelpers";
import { groupByDateKey, sortDateKeysDesc, filterDateKeys, formatDateKey, toDateKey, formatTimestamp } from "@/lib/dates";
import { TASK_COLUMNS, adjacentTaskStatus } from "@/lib/lifecycle";
import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownDivider } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { fileToBase64 } from "@/lib/utils";
import { DELIVERABLE_REVISION_CAP } from "@/lib/workflowHelpers";
import { TeamRosterPanel } from "@/components/TeamRosterPanel";
import {
  LayoutDashboard,
  MessageSquare,
  Archive,
  CheckSquare,
  CreditCard,
  Users,
  Send,
  Paperclip,
  Download,
  X,
  Plus,
  Clock,
  AlertCircle,
  Calendar,
  Trash2,
  Edit,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  Mic,
  MicOff,
  Bot,
  Printer,
  Search,
  Eye,
  Sparkles,
  LayoutGrid,
  Star,
  Award,
  User, CalendarClock } from "lucide-react";
import {
  sendMessage,
  shareFile,
  createProjectUpdate,
  updateProjectUpdateStatus,
  createTask,
  updateTaskStatus,
  updateTaskDetails,
  deleteTask,
  deleteFile,
  updateDeliverableStatus,
  uploadDeliverableVersion,
  deleteMessage,
  markMessagesAsRead,
} from "@/actions/collaborationActions";
import { completeProject, getProjectReviewStatus, getProjectCompletionReadiness } from "@/actions/reviewActions";
import { updateProjectDueDate } from "@/actions/projectActions";
import { ProjectCompletionModal } from "@/components/ProjectCompletionModal";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MessageItem {
  id: string;
  content: string;
  createdAt: Date | string;
  senderId: string;
  channel: string;
  seen?: boolean;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  };
}

interface SharedFileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string | null;
  uploadedAt: Date | string;
  uploadedById: string;
  channel: string;
  uploadedBy: {
    id: string;
    name: string | null;
    role: string;
  };
}

interface ProjectUpdateItem {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    role: string;
  };
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  assignedToId: string | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  assignedTo: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  };
}

interface WorkspaceViewProps {
  /** The application this workspace is opened for. */
  applicationId?: string;
  /** Raw project description; funding reads the compensation metadata from it. */
  projectDescription?: string | null;
  /** Shared role roster; undefined/zero-role projects render the original Team tab only. */
  teamRoster?: Awaited<ReturnType<typeof import("@/actions/roleActions").getProjectTeam>>;
  role: "COMPANY" | "FREELANCER";
  currentUserId: string;
  projectId: string;
  projectTitle: string;
  projectBudget: number;
  projectStatus: string;
  projectDueDate: Date | string | null;
  companyName: string;
  hiredFreelancers: {
    id: string;
    /** The hired application id — what every payment action keys off. */
    applicationId?: string;
    name: string | null;
    image: string | null;
    role: string;
    freelancerId: string;
  }[];
  companyUser: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
    companyId: string;
  };
  initialMessages: MessageItem[];
  initialFiles: SharedFileItem[];
  initialUpdates: ProjectUpdateItem[];
  initialTasks: TaskItem[];
  /** WS-003/DATA-008/DATA-009: authoritative figures from the payment tables. */
  financials: {
    currency: string;
    type: "FIXED" | "HOURLY" | "MILESTONE" | "STIPEND" | "UNPAID";
    budget: number;
    committed: number;
    paid: number;
  };
}

interface DeliverableMeta {
  size: string;
  status: "PENDING" | "APPROVED" | "REVISION_REQUESTED";
  feedback?: string;
  version: number;
  /** Revision rounds already consumed on this deliverable. */
  revisionCount: number;
  /** Agreed maximum rounds, so the remaining budget is always visible. */
  revisionCap: number;
}

// Helpers for serializing file properties & milestones
function parseDeliverableMeta(fileSizeStr: string | null): DeliverableMeta {
  if (!fileSizeStr)
    return { size: "Unknown size", status: "PENDING", version: 1, revisionCount: 0, revisionCap: DELIVERABLE_REVISION_CAP };
  try {
    const parsed = JSON.parse(fileSizeStr);
    if (parsed && typeof parsed === "object" && "status" in parsed) {
      return {
        size: parsed.size || "Unknown size",
        status: parsed.status || "PENDING",
        feedback: parsed.feedback || "",
        version: parsed.version || 1,
        revisionCount: parsed.revisionCount ?? 0,
        revisionCap: parsed.revisionCap ?? DELIVERABLE_REVISION_CAP,
      };
    }
  } catch (e) {}
  return { size: fileSizeStr, status: "PENDING", version: 1, revisionCount: 0, revisionCap: DELIVERABLE_REVISION_CAP };
}

function parseMilestoneAmount(title: string, description: string): { amount: number; cleanTitle: string } {
  const titleMatch = title.match(/\[(?:Value:?\s*\$?)?([\d,]+)\]/);
  if (titleMatch) {
    const amount = parseFloat(titleMatch[1].replace(/,/g, ""));
    const cleanTitle = title.replace(titleMatch[0], "").trim();
    return { amount, cleanTitle };
  }
  
  const descMatch = description.match(/\[(?:Value:?\s*\$?)?([\d,]+)\]/);
  if (descMatch) {
    const amount = parseFloat(descMatch[1].replace(/,/g, ""));
    return { amount, cleanTitle: title };
  }

  const rawMatch = title.match(/\$(\d+[\d,]*)/);
  if (rawMatch) {
    const amount = parseFloat(rawMatch[1].replace(/,/g, ""));
    return { amount, cleanTitle: title };
  }

  return { amount: 0, cleanTitle: title };
}

/**
 * WS-009 — this used to render a play button, progress bar and waveform, and
 * synthesise tones with Web Audio + Math.random(). No audio was ever captured
 * or stored: the message body is only a text token. A recipient heard generated
 * noise, indistinguishable from a working feature.
 *
 * Voice capture is removed, so no new tokens are created. Tokens already in
 * message history render as an honest placeholder rather than fake audio.
 */
function VoiceMessagePlayer({ isMe }: { content: string; isMe: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-2.5 min-w-[200px] rounded-lg border px-3 py-2 " +
        (isMe ? "border-white/25 bg-white/10" : "border-[#E3E5EA] bg-[#F8F9FB]")
      }
    >
      <MicOff className={"h-4 w-4 shrink-0 " + (isMe ? "text-white/70" : "text-[#5B6272]")} />
      <span className={"text-[11px] font-semibold " + (isMe ? "text-white/85" : "text-[#5B6272]")}>
        Voice message — playback not available
      </span>
    </div>
  );
}


export function WorkspaceView({
  applicationId,
  projectDescription,
  teamRoster,
  role,
  currentUserId,
  projectId,
  projectTitle,
  projectBudget,
  projectStatus: initialProjectStatus,
  projectDueDate: initialProjectDueDate,
  companyName,
  hiredFreelancers,
  companyUser,
  initialMessages,
  initialFiles,
  initialUpdates,
  initialTasks,
  financials,
}: WorkspaceViewProps) {

  const router = useRouter();

  // Navigation Menu: "overview" | "messages" | "deliverables" | "tasks" | "team" | "milestones"
  const [activeView, setActiveView] = useState<"overview" | "messages" | "deliverables" | "tasks" | "team" | "milestones" | "meetings">("overview");

  // Mobile menu drawer toggle state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile chat view toggler: shows channels list on mobile vs the conversation
  const [showMobileChatSidebar, setShowMobileChatSidebar] = useState(true);

  // Active Chat Channel or DM Key
  const [activeChannel, setActiveChannel] = useState<string>("group");

  // Helper: Get DM channel key with another user
  const getDMChannelKey = (otherUserId: string) => {
    return `dm:${[currentUserId, otherUserId].sort().join(":")}`;
  };

  // Helper: Resolve Channel Display Name
  const getChannelName = (chan: string) => {
    if (chan === "group") return "group-chat";
    if (chan === "freelancers") return "freelancers-private";
    if (chan.startsWith("dm:")) {
      const parts = chan.split(":");
      const otherId = parts[1] === currentUserId ? parts[2] : parts[1];
      if (otherId === companyUser.id) return `${companyName} (Client)`;
      const fUser = hiredFreelancers.find((f) => f.id === otherId);
      return fUser ? `${fUser.name} (Freelancer)` : "Direct Message";
    }
    return chan;
  };

  // Sync states
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [files, setFiles] = useState<SharedFileItem[]>(initialFiles);
  const [updates, setUpdates] = useState<ProjectUpdateItem[]>(initialUpdates);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  // ── Project Completion State ──────────────────────────────────────────────
  const [projectStatus, setProjectStatus] = useState(initialProjectStatus);
  const [projectDueDate, setProjectDueDate] = useState<any>(initialProjectDueDate);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<{
    reviewedByCompany: string[];
    reviewedByFreelancer: Record<string, boolean>;
    allReviewsDone: boolean;
    companyId: string;
    currentUserReviewedCompany: boolean;
    hiredFreelancers: { userId: string; name: string | null; image: string | null; freelancerId: string }[];
  } | null>(null);

  // Sync projectDueDate prop updates
  useEffect(() => {
    setProjectDueDate(initialProjectDueDate);
  }, [initialProjectDueDate]);

  const handleUpdateProjectDueDate = async (newDateString: string) => {
    setProjectDueDate(newDateString || null);
    try {
      await updateProjectDueDate(projectId, newDateString || null);
    } catch (err: any) {
      setActionError("Failed to update project due date: " + err.message);
      setProjectDueDate(initialProjectDueDate);
    }
  };

  // Fetch review status when project is COMPLETED
  useEffect(() => {
    if (projectStatus === "COMPLETED") {
      getProjectReviewStatus(projectId).then((s) => {
        setReviewStatus({
          reviewedByCompany: s.reviewedByCompany,
          reviewedByFreelancer: s.reviewedByFreelancer,
          allReviewsDone: s.allReviewsDone,
          companyId: s.companyId,
          currentUserReviewedCompany: s.currentUserReviewedCompany,
          hiredFreelancers: s.hiredFreelancers,
        });
      }).catch(() => {});
    }
  }, [projectId, projectStatus]);

  // Project-level completion readiness. Server is the authority; the freelancer
  // filter never feeds into this, so one settled freelancer cannot unlock it.
  const [completionBlockedReason, setCompletionBlockedReason] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  /**
   * UX-002 / UX-003 — destructive and money-moving actions used native
   * alert()/confirm(): unstyled, blocking, and applied inconsistently (task
   * deletion was confirmed, file and message deletion were not, and no
   * financial action was confirmed at all despite releases being irreversible).
   *
   * One promise-based dialog backed by the existing Modal component replaces
   * both, so every call site gets the same treatment.
   */
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    detail?: string;
    confirmLabel: string;
    destructive?: boolean;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirmAction = (opts: {
    title: string;
    body: string;
    /** Echoed back verbatim — e.g. the amount being released (UX-003). */
    detail?: string;
    confirmLabel: string;
    destructive?: boolean;
  }) =>
    new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve }));

  const closeConfirm = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  useEffect(() => {
    if (projectStatus === "COMPLETED") { setCompletionBlockedReason(null); return; }
    let alive = true;
    getProjectCompletionReadiness(projectId)
      .then((r) => { if (alive) setCompletionBlockedReason(r.ready ? null : r.reason || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [projectId, projectStatus]);

  const handleCompleteProject = async () => {
    if (isCompletingProject) return;
    if (projectStatus === "COMPLETED") return;
    if (completionBlockedReason) {
      setCompletionNotice(completionBlockedReason);
      return;
    }
    setIsCompletingProject(true);
    try {
      await completeProject(projectId);
      setProjectStatus("COMPLETED");
      const s = await getProjectReviewStatus(projectId);
      setReviewStatus({
        reviewedByCompany: s.reviewedByCompany,
        reviewedByFreelancer: s.reviewedByFreelancer,
        allReviewsDone: s.allReviewsDone,
        companyId: s.companyId,
        currentUserReviewedCompany: s.currentUserReviewedCompany,
        hiredFreelancers: s.hiredFreelancers,
      });
      setShowReviewModal(true);
    } catch (e: any) {
      setCompletionNotice(e.message || "Project cannot be completed yet. Some required work or payments are still pending.");
    } finally {
      setIsCompletingProject(false);
    }
  };

  const handleReviewDone = async () => {
    setShowReviewModal(false);
    const s = await getProjectReviewStatus(projectId);
    setReviewStatus({
      reviewedByCompany: s.reviewedByCompany,
      reviewedByFreelancer: s.reviewedByFreelancer,
      allReviewsDone: s.allReviewsDone,
      companyId: s.companyId,
      currentUserReviewedCompany: s.currentUserReviewedCompany,
      hiredFreelancers: s.hiredFreelancers,
    });
  };

  /**
   * WS-007 — the completion CTA used to be gated on every ProjectUpdate being
   * COMPLETED, so a FIXED, HOURLY or STIPEND project that never created
   * workspace "milestones" had updates.length === 0 and the CTA never appeared,
   * regardless of payment state. It is now gated on the server readiness check
   * (LIFE-001s single completion authority), which is already loaded above.
   *
   * WS-010 — the milestonesFromUpdates filter removed: its double negative made
   * the second clause unreachable and the result was never used.
   */
  const canOfferCompletion = completionBlockedReason === null;
  const [taskViewMode, setTaskViewMode] = useState<"board" | "timeline">("board");
  // Timeline: optional single-day filter (YYYY-MM-DD).
  const [timelineDate, setTimelineDate] = useState("");

  // Sync background polling every 3s
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    let active = true;
    const fetchWorkspaceUpdates = async () => {
      try {
        const res = await fetch(`/api/workspace/${projectId}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;

        setMessages((curr) => {
          const serialize = (list: MessageItem[]) => list.map(m => `${m.id}-${m.seen}`).join("|");
          return serialize(data.messages) !== serialize(curr) ? data.messages : curr;
        });

        setTasks((curr) => {
          const serialize = (list: TaskItem[]) => list.map(t => `${t.id}-${t.status}-${t.priority}-${t.assignedToId}`).join("|");
          return serialize(data.tasks) !== serialize(curr) ? data.tasks : curr;
        });

        // WS-006 — this compared array length only, so a deliverable approval
        // or revision request (which changes the embedded status, not the
        // count) never propagated to the reviewing party until a manual
        // refresh. Serialised like the other three lists.
        setFiles((curr) => {
          const serialize = (list: SharedFileItem[]) =>
            list.map((f) => f.id + "-" + (f.fileSize ?? "") + "-" + f.fileName).join("|");
          return serialize(data.files) !== serialize(curr) ? data.files : curr;
        });
        
        setUpdates((curr) => {
          const serialize = (list: ProjectUpdateItem[]) => list.map(u => `${u.id}-${u.status}`).join("|");
          return serialize(data.updates) !== serialize(curr) ? data.updates : curr;
        });
      } catch (err) {
        console.error("Workspace sync error:", err);
        if (active) {
          setActionError(
            "Live updates have stopped. You may be seeing out-of-date information — refresh to reconnect."
          );
        }
      }
    };

    /**
     * WS-005 — a 3s full refetch of messages, files, updates and tasks (four
     * joined queries) ran per open tab per user, with no delta or cursor. Ten
     * concurrent viewers was ~800 queries/minute for one project.
     *
     * Backed off to 15s and paused entirely while the tab is hidden, which is
     * the smallest change that removes the load without altering the sync
     * model. A cursor/ETag protocol is the real fix and belongs with the API.
     */
    const POLL_MS = 15000;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval === null) interval = setInterval(fetchWorkspaceUpdates, POLL_MS);
    };
    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchWorkspaceUpdates();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [projectId]);

  // Read indicator and delete message logic
  const handleMarkChannelAsRead = async (channelName: string) => {
    try {
      await markMessagesAsRead(projectId, channelName);
    } catch (e) {
      console.error("Failed to mark messages as read:", e);
    }
  };

  useEffect(() => {
    if (activeView === "messages") {
      handleMarkChannelAsRead(activeChannel);
    }
  }, [activeChannel, messages.length, activeView, projectId]);

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((curr) => curr.filter((m) => m.id !== messageId));
    try {
      const res = await deleteMessage(projectId, messageId);
      if (res.error) {
        setActionError(res.error);
        router.refresh();
      }
    } catch (err: any) {
      setActionError("Failed to delete message: " + err.message);
      router.refresh();
    }
  };

  // UI state variables
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const deliverableFileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording simulation
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceWave, setVoiceWave] = useState<number[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  // WS-009 — the assistant panel remains, but its conversation state, input
  // and typing indicator are gone with the simulation that produced them.
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [selectedFreelancerFilter, setSelectedFreelancerFilter] = useState<string>("all");

  // Deliverables upload / review
  const [deliverableVersionTargetId, setDeliverableVersionTargetId] = useState<string | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<SharedFileItem | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Milestones add
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);

  // Invoice generator
  const [selectedInvoiceMilestone, setSelectedInvoiceMilestone] = useState<ProjectUpdateItem | null>(null);

  // Search filtering
  const [taskSearch, setTaskSearch] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const routerRefresh = useRouter();

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeView === "messages") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeView]);

  // Formatter bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // HANDLER: General Send Message
  const handleSendMessage = async (e: React.FormEvent, contentText?: string) => {
    if (e) e.preventDefault();
    const textToSend = contentText || newMessage;
    if (!textToSend.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    if (!contentText) setNewMessage("");

    const optimistic: MessageItem = {
      id: `temp-${Date.now()}`,
      content: textToSend,
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      channel: activeChannel,
      sender: {
        id: currentUserId,
        name: role === "COMPANY" ? companyName : (hiredFreelancers.find(f => f.id === currentUserId)?.name || "Freelancer"),
        image: role === "COMPANY" ? companyUser.image : (hiredFreelancers.find(f => f.id === currentUserId)?.image || null),
        role,
      },
    };

    setMessages((prev) => [...prev, optimistic]);

    const result = await sendMessage(projectId, textToSend, activeChannel);
    setIsSendingMessage(false);

    if (result.error) {
      setActionError(result.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  // HANDLER: Share File Deliverable
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNewVersionOfId?: string) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj || isUploadingFile) return;

    setIsUploadingFile(true);
    const fileName = fileObj.name;
    const bytesFormatted = formatBytes(fileObj.size);
    const tempId = `temp-file-${Date.now()}`;
    const mockFileUrl = `/workspace/downloads/${encodeURIComponent(fileName)}`;

    const metaInfo: DeliverableMeta = {
      size: bytesFormatted,
      status: "PENDING",
      version: isNewVersionOfId ? 2 : 1,
      revisionCount: 0,
      revisionCap: DELIVERABLE_REVISION_CAP,
    };

    const optimistic: SharedFileItem = {
      id: tempId,
      fileName,
      fileUrl: mockFileUrl,
      fileSize: JSON.stringify(metaInfo),
      uploadedAt: new Date().toISOString(),
      uploadedById: currentUserId,
      channel: activeChannel,
      uploadedBy: {
        id: currentUserId,
        name: role === "COMPANY" ? companyName : (hiredFreelancers.find(f => f.id === currentUserId)?.name || "Freelancer"),
        role,
      },
    };

    setFiles((prev) => [optimistic, ...prev]);

    try {
      const realUrl = await fileToBase64(fileObj, 3.0);

      let result;
      if (isNewVersionOfId) {
        result = await uploadDeliverableVersion(projectId, isNewVersionOfId, fileName, realUrl, bytesFormatted);
      } else {
        result = await shareFile(projectId, fileName, realUrl, JSON.stringify(metaInfo), activeChannel);
      }

      if (result.error) {
        setActionError(result.error);
        setFiles((prev) => prev.filter(f => f.id !== tempId));
      }
    } catch (err: any) {
      setActionError("Failed to share file deliverable.");
      setFiles((prev) => prev.filter(f => f.id !== tempId));
    } finally {
      setIsUploadingFile(false);
      setDeliverableVersionTargetId(null);
      if (deliverableFileInputRef.current) deliverableFileInputRef.current.value = "";
    }
  };

  const handleChatFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj || isUploadingChatFile) return;

    setIsUploadingChatFile(true);
    const fileName = fileObj.name;
    const bytesFormatted = formatBytes(fileObj.size);

    try {
      const realUrl = await fileToBase64(fileObj, 3.0);
      const fileMsgContent = `[FILE:${fileName}|${realUrl}|${bytesFormatted}]`;
      await handleSendMessage(null as any, fileMsgContent);
    } catch (err: any) {
      setActionError("Failed to attach file to chat.");
    } finally {
      setIsUploadingChatFile(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
    }
  };

  // HANDLER: Delete File
  const handleDeleteFile = async (fileId: string) => {
    // UX-002 — file deletion was previously unconfirmed, unlike task deletion.
    const ok = await confirmAction({
      title: "Delete deliverable",
      body: "This file will be removed from the workspace for everyone, and deleted from storage. This cannot be undone.",
      confirmLabel: "Delete file",
      destructive: true,
    });
    if (!ok) return;
    setFiles((prev) => prev.filter(f => f.id !== fileId));
    const result = await deleteFile(projectId, fileId);
    if (result.error) {
      setActionError(result.error);
    }
  };

  // HANDLER: Deliverable review actions
  const handleReviewDeliverable = async (fileId: string, status: "APPROVED" | "REVISION_REQUESTED") => {
    if (!reviewFeedback.trim()) {
      setActionError("Please provide revision feedback or approval comments first.");
      return;
    }
    setIsReviewing(true);

    const result = await updateDeliverableStatus(projectId, fileId, status, reviewFeedback);
    setIsReviewing(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setReviewFeedback("");
      setSelectedPreviewFile(null);
      
      // Auto-update milestone if approved
      if (status === "APPROVED") {
        // Find corresponding milestone update title to auto complete
        const deliverable = files.find(f => f.id === fileId);
        if (deliverable) {
          const matchingMilestone = updates.find(u => 
            u.title.toLowerCase().includes(deliverable.fileName.split(".")[0].toLowerCase()) && 
            u.status !== "COMPLETED"
          );
          if (matchingMilestone) {
            await updateProjectUpdateStatus(projectId, matchingMilestone.id, "COMPLETED");
          }
        }
      }
    }
  };

  // HANDLER: Milestones CRUD
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || isSubmittingMilestone) return;

    setIsSubmittingMilestone(true);
    /**
     * WS-003 / WS-004 — the amount used to be encoded into the title as
     * `[Value: $X]` and recovered later by regex. That made a progress note the
     * carrier of financial data, and because the value was written with
     * `toLocaleString()` and read back with a comma-assuming pattern, a German
     * or French locale stored 5,000 and read back 5.
     *
     * ProjectUpdate is a progress record. Money lives in the payment tables.
     */
    const result = await createProjectUpdate(projectId, newMilestoneTitle.trim(), newMilestoneDesc, "PENDING");
    setIsSubmittingMilestone(false);
    setNewMilestoneTitle("");
    setNewMilestoneDesc("");
    setShowAddMilestoneModal(false);

    if (result.error) {
      setActionError(result.error);
    }
  };

  const handleUpdateMilestoneStatus = async (updateId: string, newStatus: string) => {
    // Snappy optimistic local state update
    setUpdates((prev) => prev.map((u) => u.id === updateId ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u));
    
    const result = await updateProjectUpdateStatus(projectId, updateId, newStatus);
    if (result.error) {
      setActionError(result.error);
      // Revert if error
      getProjectReviewStatus(projectId).then(() => {
        router.refresh();
      });
    }
  };

  // HANDLER: Tasks CRUD
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isSubmittingTask) return;

    setIsSubmittingTask(true);
    const result = await createTask(projectId, newTaskTitle, newTaskDesc, newTaskPriority, newTaskDueDate, newTaskAssignee);
    setIsSubmittingTask(false);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskPriority("MEDIUM");
    setNewTaskDueDate("");
    setNewTaskAssignee("");
    setShowAddTaskModal(false);

    if (result.error) {
      setActionError(result.error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    /**
     * KANBAN-005 — the optimistic update was never rolled back on failure, so
     * after a rejected move the board kept showing a state the server had
     * refused until a manual refresh. The previous state is captured and
     * restored, matching the recovery the milestone handler already had.
     */
    const previous = tasks;
    setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    const result = await updateTaskStatus(projectId, taskId, newStatus);
    if (result.error) {
      setTasks(previous);
      setActionError(result.error);
    }
  };

  const handleUpdateTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || isUpdatingTask) return;

    setIsUpdatingTask(true);
    const result = await updateTaskDetails(projectId, selectedTask.id, {
      title: selectedTask.title,
      description: selectedTask.description || "",
      priority: selectedTask.priority,
      dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString() : "",
      assignedToId: selectedTask.assignedToId || null,
    });
    setIsUpdatingTask(false);
    setShowTaskDetailModal(false);
    setSelectedTask(null);

    if (result.error) {
      setActionError(result.error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // UX-002 — destructive confirmation via the app Modal rather than a native
    // confirm(); see confirmAction below.
    const ok = await confirmAction({
      title: "Delete task",
      body: "This task will be removed from the board for everyone on the project. This cannot be undone.",
      confirmLabel: "Delete task",
      destructive: true,
    });
    if (!ok) return;

    // KANBAN-005 — restore on failure rather than leaving the card removed.
    const previous = tasks;
    setTasks((prev) => prev.filter(t => t.id !== taskId));
    setShowTaskDetailModal(false);
    setSelectedTask(null);
    const result = await deleteTask(projectId, taskId);
    if (result.error) {
      setTasks(previous);
      setActionError(result.error);
    }
  };
  /**
   * WS-009 — startVoiceRecording / stopAndSendVoice / cancelVoiceRecording were
   * a simulation: a timer, a Math.random() waveform, and a text token emitted as
   * if it were audio. Removed. Voice messaging is not implemented, and the UI no
   * longer suggests otherwise.
   */

  /**
   * WS-009 — this was presented as "your Talentra AI Workspace Assistant" but
   * was keyword matching over canned replies (lower.includes("task") /
   * "budget" / "deadline"...). There is no model behind it.
   *
   * Removed rather than left looking functional. The panel now states plainly
   * that the assistant is unavailable; input is disabled so nothing appears to
   * be answered.
   */

  // CRITICAL: Filter tasks
  /**
   * TIME-005 — nothing in the workspace expressed an overdue state. Compared on
   * ISO date keys so the comparison is timezone-stable (TIME-001/TIME-002).
   */
  const todayKey = toDateKey(new Date());
  const isOverdue = (t: TaskItem) =>
    !!t.dueDate && t.status !== "DONE" && toDateKey(t.dueDate) < todayKey;

  const filteredTasksList = tasks.filter(t => 
    t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()))
  );

  // Group completed tasks (DONE status) chronologically by date
  const completedTasks = tasks.filter(t => {
    const matchesStatus = t.status === "DONE";
    const matchesSearch = taskSearch 
      ? t.title.toLowerCase().includes(taskSearch.toLowerCase()) || (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase())) 
      : true;
    const matchesFreelancer = selectedFreelancerFilter === "all"
      ? true
      : t.assignedToId === selectedFreelancerFilter;
    return matchesStatus && matchesSearch && matchesFreelancer;
  });

  /**
   * TIME-001 — grouped, sorted and filtered on a stable ISO key. This used to
   * key on a localised display string and then feed that string back into
   * new Date() to sort and filter, which produced Invalid Date (and therefore
   * arbitrary ordering and a dead filter) in every non-English locale.
   * Formatting now happens only at render.
   */
  /**
   * TIME-003 — this view lists DONE tasks and presents itself as a record of
   * completed work, but it keyed on the *scheduled* date, so a task completed
   * today but due next month filed under next month.
   *
   * Task has no completedAt column, so updatedAt — last written when the task
   * was moved to DONE — is the closest available completion signal. The
   * scheduled date is now only a fallback.
   */
  const groupedTimeline = groupByDateKey(
    completedTasks,
    (task) => task.updatedAt ?? task.dueDate ?? task.createdAt
  );

  const sortedDates = sortDateKeysDesc(
    filterDateKeys(Object.keys(groupedTimeline), timelineDate)
  );

  // MILESTONE COMPLETION CALCULATION
  const completedMilestones = updates.filter((u) => u.status === "COMPLETED").length;
  const milestonePercentage = updates.length > 0 ? Math.round((completedMilestones / updates.length) * 100) : 0;

  // Compensation model drives the Funding / Payments module. Projects predating
  // the field fall through to the original milestone escrow UI unchanged.
  /**
   * DATA-009 — this defaulted to "MILESTONE" while WorkspaceFunding defaulted
   * to "FIXED" for the same project, so one workspace could describe its own
   * compensation two different ways. Both now use the value the server resolved
   * from ProjectCompensation.
   */
  const compensationType = financials.type;

  /**
   * DATA-007 / UX-004 — one money formatter for this component. Amounts were
   * rendered with a literal "$" while the contract line beside them used the
   * project's real currency, so an INR project showed "₹50,00,000 Fixed" above
   * "$5000000". Never parse the output of this back into a number.
   */
  const money = (amount: number) =>
    `${getCurrencySymbol(financials.currency)}${(amount || 0).toLocaleString()}`;
  // Contract declaration: type, value and currency all read from the stored
  // project configuration; never defaulted, never inferred from UI state.
  const contractLabel =
    compensationType === "HOURLY" ? "Rate" : compensationType === "STIPEND" ? "Stipend" : "Contract";
  const contractValue =
    compensationType === "UNPAID"
      ? "Unpaid / Volunteer"
      : formatCompensation({ budget: projectBudget, description: projectDescription });

  /**
   * WS-003 / DATA-008 — these totals used to be summed by running a regex over
   * ProjectUpdate titles, so the Overview showed money derived from prose that
   * bore no relation to the real payment records in the Funding tab one tab
   * away. They now come from the payment tables via the server.
   */
  const fundsEscrowed = financials.committed;
  const fundsPaid = financials.paid;

  return (
    // RESP-001 — w-screen is 100vw, which includes the vertical scrollbar width,
    // so the root was wider than the viewport and overflow-hidden clipped
    // content at the right edge rather than preventing the overflow. w-full
    // matches the containing block instead.
    <div className="h-dvh w-full flex flex-col bg-[#F8F9FB] text-[#1A1D29] font-sans overflow-hidden">

      {/* ── UX-002/UX-003: shared confirmation dialog ── */}
      {confirmState && (
        <Modal open onClose={() => closeConfirm(false)} title={confirmState.title}>
          <div className="space-y-4">
            <p className="text-xs text-[#5B6272] leading-relaxed">{confirmState.body}</p>
            {confirmState.detail && (
              <div className="rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-4 py-3">
                <span className="text-sm font-bold text-[#1A1D29]">{confirmState.detail}</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                onClick={() => closeConfirm(false)}
                className="text-xs font-bold px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => closeConfirm(true)}
                className={
                  "text-xs font-bold px-4 cursor-pointer text-white " +
                  (confirmState.destructive
                    ? "bg-[#BC2A2A] hover:bg-[#a02424]"
                    : "bg-[#152C55] hover:bg-[#1E3D71]")
                }
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* UX-002/UX-005 — errors surface in the UI instead of a native alert. */}
      {actionError && (
        <div className="shrink-0 bg-[#FDEAEA] border-b border-[#F5C2C2] px-6 py-2.5 flex items-center justify-between gap-4 z-30">
          <span className="text-xs font-semibold text-[#BC2A2A]">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-bold text-[#BC2A2A] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── COMPLETION REVIEW MODAL ── */}
      {showReviewModal && reviewStatus && (
        <ProjectCompletionModal
          projectId={projectId}
          projectTitle={projectTitle}
          role={role}
          hiredFreelancers={reviewStatus.hiredFreelancers}
          alreadyReviewedIds={reviewStatus.reviewedByCompany}
          companyId={reviewStatus.companyId}
          companyName={companyName}
          alreadyReviewedCompany={reviewStatus.currentUserReviewedCompany}
          onClose={() => setShowReviewModal(false)}
          onDone={handleReviewDone}
        />
      )}
      
      {/* Workspace Top Header — professional single-bar layout */}
      <header className="bg-white border-b border-[#E3E5EA] px-4 md:px-6 h-16 flex items-center justify-between gap-4 shrink-0 z-30">

        {/* LEFT — project identity */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Company logo as project icon */}
          <div className="h-9 w-9 rounded-lg bg-[#152C55] flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden border border-white/10">
            {companyUser.image
              ? <img src={companyUser.image} alt={companyName} className="h-full w-full object-cover" />
              : <span className="text-sm font-bold">{projectTitle[0]?.toUpperCase() || "T"}</span>
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-[#1A1D29] tracking-tight leading-snug">{projectTitle}</h1>
              {projectStatus === "COMPLETED" ? (
                <span className="hidden sm:flex items-center gap-1 bg-[#E8F1FE] border border-[#E3E5EA]/40 text-[#1A1D29] text-[11px] font-medium py-0.5 px-2 rounded-full shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-1 bg-[#F8F9FB] border border-[#C7CBD6] text-[#1A1D29] text-[11px] font-medium py-0.5 px-2 rounded-full shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#152C55] animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider hidden sm:block mt-0.5">{companyName} · Workspace</p>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="hidden md:block h-6 w-px bg-[#E8F1FE] shrink-0" />

        {/* CENTER — team avatars + budget/deadline chips (hidden on small mobile) */}
        <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
          {/* Team stack */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider">Team</span>
            <div className="flex -space-x-2">
              <div
                onClick={() => router.push(`/companies/${companyUser.companyId}`)}
                className="h-7 w-7 rounded-full bg-[#152C55] border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shrink-0 cursor-pointer hover:z-10 transition-transform overflow-hidden"
                title={`${companyName} (Client)`}
              >
                {companyUser.image ? <img src={companyUser.image} alt={companyName} className="h-full w-full object-cover" /> : companyName[0]?.toUpperCase()}
              </div>
              {hiredFreelancers.map((f) => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/freelancers/${f.freelancerId}`)}
                  className="h-7 w-7 rounded-full bg-[#152C55] border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shrink-0 cursor-pointer hover:z-10 transition-transform overflow-hidden"
                  title={`${f.name} (Freelancer)`}
                >
                  {f.image ? <img src={f.image} alt={f.name || ""} className="h-full w-full object-cover" /> : f.name?.[0]?.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-[#FFF3DC]" />

          {/* Budget chip */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider">{contractLabel}</span>
            <span className="text-xs font-semibold text-[#1A1D29]">{contractValue}</span>
          </div>

          {/* Deadline chip */}
          {role === "COMPANY" ? (
            <div className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg px-2.5 py-1 relative group">
              <span className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider">Due</span>
              <input
                type="date"
                value={projectDueDate ? new Date(projectDueDate).toISOString().split("T")[0] : ""}
                onChange={(e) => handleUpdateProjectDueDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-semibold text-[#1A1D29] cursor-pointer focus:ring-0 w-24 p-0"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider">Due</span>
              <span className="text-xs font-semibold text-[#1A1D29]">
                {projectDueDate ? new Date(projectDueDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "No Due Date"}
              </span>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="hidden md:block h-6 w-px bg-[#EAF1FE] shrink-0" />

        {/* RIGHT — current user avatar + quick actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Current user avatar */}
          {(() => {
            const isCompany = role === "COMPANY";
            const currentImg = isCompany
              ? companyUser.image
              : hiredFreelancers.find(f => f.id === currentUserId)?.image ?? null;
            const currentName = isCompany
              ? companyName
              : hiredFreelancers.find(f => f.id === currentUserId)?.name ?? "You";
            return (
              <div
                className="h-8 w-8 rounded-full border-2 border-[#1A1D29] overflow-hidden bg-[#152C55] flex items-center justify-center text-xs font-bold text-white shrink-0"
                title={`${currentName} (You)`}
              >
                {currentImg
                  ? <img src={currentImg} alt={currentName} className="h-full w-full object-cover" />
                  : currentName[0]?.toUpperCase() ?? "U"
                }
              </div>
            );
          })()}

          {/* Quick Actions Dropdown */}
          <Dropdown
            align="right"
            panelClassName="w-56"
            trigger={
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#152C55] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E3D71]">
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Quick Actions
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            }
          >
            {(close) => (
              <>
                <DropdownItem
                  icon={<CheckSquare className="h-4 w-4 text-[#5B6272]" aria-hidden="true" />}
                  onClick={() => { close(); setShowAddTaskModal(true); }}
                >
                  Create Task
                </DropdownItem>
                <DropdownItem
                  icon={<Paperclip className="h-4 w-4 text-[#5B6272]" aria-hidden="true" />}
                  onClick={() => { close(); deliverableFileInputRef.current?.click(); }}
                >
                  Share Deliverable
                </DropdownItem>
                {role === "COMPANY" && (
                  <>
                    <DropdownDivider />
                    <DropdownItem
                      icon={<Sparkles className="h-4 w-4 text-[#5B6272]" aria-hidden="true" />}
                      onClick={() => { close(); setShowAddMilestoneModal(true); }}
                    >
                      Add Milestone
                    </DropdownItem>
                  </>
                )}
              </>
            )}
          </Dropdown>
        </div>
      </header>

      {/* ── PROJECT COMPLETION BANNERS ─────────────────────────────────── */}

      {/* All milestones done → Company can mark project complete */}
      {role === "COMPANY" && (projectStatus === "IN_PROGRESS" || projectStatus === "OPEN") && canOfferCompletion && (
        <div className="shrink-0 bg-rail-bg-light px-6 py-3 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-canvas rounded-lg border border-rail-elevated-light">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs font-semibold text-on-rail-ink">All milestones completed</p>
              <p className="text-[11px] text-on-rail-muted">Milestone tracking status only — project completion is governed by the Project Completion panel.</p>
            </div>
          </div>
          {/* Completion is triggered from the project-level header panel. */}
        </div>
      )}

      {/* Project is COMPLETED → review CTAs */}
      {projectStatus === "COMPLETED" && reviewStatus && !reviewStatus.allReviewsDone && (
        <div className="shrink-0 bg-[#152C55] px-6 py-3 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-canvas rounded-lg border border-rail-elevated-light">
              <Star className="h-4 w-4 text-[#8F5E08]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-on-rail-ink">Project Completed — Leave a Review</p>
              <p className="text-[11px] text-on-rail-ink/70">
                {role === "COMPANY"
                  ? `${reviewStatus.reviewedByCompany.length}/${reviewStatus.hiredFreelancers.length} freelancers reviewed`
                  : reviewStatus.currentUserReviewedCompany
                  ? "You've already reviewed this company"
                  : "Your feedback helps build trust on the platform."}
              </p>
            </div>
          </div>
          {role === "COMPANY" && reviewStatus.reviewedByCompany.length < reviewStatus.hiredFreelancers.length && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="shrink-0 px-5 py-2 bg-white text-[#1A1D29] text-xs font-medium rounded-full hover:bg-[#E8F1FE] transition-colors cursor-pointer"
            >
              Review Freelancers →
            </button>
          )}
          {role === "FREELANCER" && !reviewStatus.currentUserReviewedCompany && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="shrink-0 px-5 py-2 bg-white text-[#1A1D29] text-xs font-medium rounded-full hover:bg-[#E8F1FE] transition-colors cursor-pointer"
            >
              Review Company →
            </button>
          )}
        </div>
      )}

      {/* All reviews done → Project Sealed */}
      {projectStatus === "COMPLETED" && reviewStatus?.allReviewsDone && (
        <div className="shrink-0 bg-[#152C55] px-6 py-3 flex items-center gap-3 z-20 border-t border-white/10">
          <div className="p-1.5 bg-white/10 rounded-lg border border-white/20">
            <Award className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Contract Sealed — All Reviews Complete</p>
            <p className="text-[11px] text-white/70">All parties have reviewed. The project is fully closed.</p>
          </div>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <nav className="bg-white border-b border-[#E3E5EA] px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 z-20">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "milestones", label: "Funding / Payments", icon: Sparkles },
          { id: "tasks", label: "Tasks", icon: CheckSquare },
          { id: "deliverables", label: "Deliverables", icon: Archive },
          { id: "messages", label: "Chat", icon: MessageSquare },
          { id: "meetings", label: "Meetings", icon: CalendarClock },
          { id: "team", label: "Team", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          let tabBadge: React.ReactNode = null;
          if (item.id === "messages" && messages.length > 0) {
            tabBadge = (
              <span className="bg-[#F8F9FB] text-[#1A1D29] text-[11px] font-medium px-1.5 py-0.5 rounded-full border border-[#E3E5EA]">
                {messages.length}
              </span>
            );
          } else if (item.id === "tasks") {
            const pendingTasks = tasks.filter(t => t.status !== "DONE").length;
            if (pendingTasks > 0) {
              tabBadge = (
                <span className="bg-[#F8F9FB] text-[#1A1D29] text-[11px] font-medium px-1.5 py-0.5 rounded-full border border-[#E3E5EA]">
                  {pendingTasks}
                </span>
              );
            }
          } else if (item.id === "milestones") {
            const pendingMilestones = updates.filter(u => u.status !== "COMPLETED").length;
            if (pendingMilestones > 0) {
              tabBadge = (
                <span className="bg-[#F8F9FB] text-[#1A1D29] text-[11px] font-medium px-1.5 py-0.5 rounded-full border border-[#E3E5EA]">
                  {pendingMilestones}
                </span>
              );
            }
          } else if (item.id === "deliverables" && files.length > 0) {
            tabBadge = (
              <span className="bg-[#F8F9FB] text-[#5B6272] text-[11px] font-medium px-1.5 py-0.5 rounded-full border border-[#C7CBD6]">
                {files.length}
              </span>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setActiveView(item.id as any); setShowMobileChatSidebar(true); }}
              className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-medium text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? "border-[#1A1D29] text-[#1A1D29] font-semibold"
                  : "border-transparent text-[#5B6272] hover:text-[#1A1D29] hover:border-[#E3E5EA]"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#1A1D29]" : "text-[#5B6272]"}`} />
              <span>{item.label}</span>
              {tabBadge}
            </button>
          );
        })}
      </nav>

      {/* Main Content Viewport */}
      <main className={`flex-1 bg-white ${
        activeView === "messages"
          ? "overflow-hidden p-2 md:p-4 lg:p-6"
          : "overflow-y-auto p-4 md:p-6 lg:p-8"
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full"
          >
              {/* overview TAB */}
              {/* Project-level completion: one action, gated by server readiness. */}
      {/*
        #1/#2 — one status component for both the pending/ready states and the
        completed state, so they share a treatment instead of two flat bars with
        different colours. The freelancer sees the completed state too, but never
        the action: completion stays company-only, exactly as before.
      */}
      <div className="mx-4 mt-3 sm:mx-6">
        <StatusIndicator
          tone={
            projectStatus === "COMPLETED" ? "success" : completionBlockedReason ? "pending" : "info"
          }
          label={
            projectStatus === "COMPLETED"
              ? "Project completed"
              : completionBlockedReason
              ? "Completion pending"
              : "Ready for completion"
          }
          detail={projectStatus !== "COMPLETED" ? completionBlockedReason : null}
          action={
            role === "COMPANY" && projectStatus !== "COMPLETED" && !completionBlockedReason ? (
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(true)}
                className="w-full cursor-pointer rounded-md bg-[#152C55] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1E3D71] sm:w-auto"
              >
                Mark Project Complete
              </button>
            ) : null
          }
        />
      </div>

      <Modal
        open={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        size="lg"
        title="Complete Project?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCompleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              loading={isCompletingProject}
              onClick={async () => { setShowCompleteConfirm(false); await handleCompleteProject(); }}
            >
              Mark Complete
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-[#5B6272]">
          All required work and payments for this project have been completed. Mark this project as
          completed?
        </p>
      </Modal>

      {completionNotice && (
        <div className="mx-6 mt-3 border-2 border-[#F5DEB0] bg-[#FFF3DC] px-4 py-2.5 text-xs font-semibold text-[#1A1D29]">
          {completionNotice}
          <button type="button" onClick={() => setCompletionNotice(null)} className="ml-3 underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {activeView === "overview" && (
                <div className="space-y-6">
                  
                  {/* Banner header card in Signature Dark Navy */}
                  <div className="bg-[#152C55] border border-[#E3E5EA] rounded-lg p-6 text-white relative overflow-hidden">
                    <div className="relative space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="cream" className="text-[11px] font-medium uppercase tracking-wider mb-2">
                            Freelance Project Portal
                          </Badge>
                          <h1 className="text-2xl font-normal tracking-tight">{projectTitle}</h1>
                          <p className="text-[#2159C9] text-xs mt-1.5 max-w-xl leading-relaxed">
                            Welcome to your workspace. Sync on tasks, track milestone disbursements, upload final deliverables, and ask our AI assistant for reports.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider">Milestones completed</p>
                          <p className="text-3xl font-normal text-[#8F5E08] mt-0.5">{milestonePercentage}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
                        <div>
                          <span className="text-[#5B6272] block text-[11px] font-medium uppercase tracking-wider">Total Contract Value</span>
                          <span className="font-semibold text-white text-sm mt-0.5 block">{money(projectBudget)}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6272] block text-[11px] font-medium uppercase tracking-wider">Funds Paid to Date</span>
                          <span className="font-semibold text-success text-sm mt-0.5 block">{money(fundsPaid)}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6272] block text-[11px] font-medium uppercase tracking-wider">Committed</span>
                          <span className="font-semibold text-[#2159C9] text-sm mt-0.5 block">{money(fundsEscrowed)}</span>
                        </div>
                        <div>
                          <span className="text-[#5B6272] block text-[11px] font-medium uppercase tracking-wider">Contract Deadline</span>
                          <span className="font-semibold text-[#8F5E08] text-sm mt-0.5 block">Dec 28, 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overview panels grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left & Middle: Recent Activity Feed & Upcoming Milestone */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Upcoming Milestone Spotlight */}
                      <Card className="border border-[#E3E5EA] p-5 relative overflow-hidden bg-white rounded-lg">
                        <div className="absolute top-0 right-0 bg-[#F8F9FB] text-[#1A1D29] font-medium text-[11px] uppercase tracking-wider px-3 py-1 rounded-bl-[8px] border-l border-b border-[#E3E5EA]">
                          Milestone Phase
                        </div>
                        <h3 className="text-xs font-medium uppercase text-[#5B6272] tracking-wider">Upcoming Milestone</h3>
                        
                        {updates.length === 0 ? (
                          /* No milestones exist yet. Previously this fell through to the
                             "all delivered" branch, so a 0%-progress project claimed to be
                             finished. An empty plan is a starting point, not a completion. */
                          <div className="py-6 space-y-2 text-xs">
                            <p className="text-[#5B6272] font-medium">
                              No milestones set yet.
                            </p>
                            <p className="text-[#2159C9] text-[11px] leading-relaxed">
                              {role === "COMPANY"
                                ? "Add a milestone phase to break this contract into deliverable stages and start tracking progress."
                                : "The client hasn't broken this contract into phases yet."}
                            </p>
                          </div>
                        ) : updates.filter(u => u.status !== "COMPLETED").length === 0 ? (
                          <div className="py-6 flex items-center gap-3 text-[#5B6272] text-xs font-medium">
                            <CheckCircle2 className="h-5 w-5 text-[#1A1D29]" />
                            All milestones successfully delivered and completed!
                          </div>
                        ) : (
                          (() => {
                            const nextMilestone = updates.filter(u => u.status !== "COMPLETED").reverse()[0];
                            const { cleanTitle } = parseMilestoneAmount(nextMilestone.title, nextMilestone.description);
                            return (
                              <div className="mt-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-[#1A1D29] text-sm">{cleanTitle}</h4>
                                  <Badge variant={nextMilestone.status === "IN_PROGRESS" ? "primary" : "neutral"}>
                                    {nextMilestone.status.replace("_", " ").toLowerCase()}
                                  </Badge>
                                </div>
                                <p className="text-xs text-[#5B6272] leading-relaxed max-w-xl">
                                  {nextMilestone.description || "No description provided."}
                                </p>
                                <div className="flex justify-between items-center pt-3 border-t border-[#E3E5EA] text-xs">
                                  <span className="font-medium text-[#5B6272]">Progress milestone</span>
                                  {role === "COMPANY" && nextMilestone.status === "PENDING" && (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(nextMilestone.id, "IN_PROGRESS")}
                                      size="sm"
                                      variant="secondary"
                                      className="text-xs py-1 h-7 font-medium cursor-pointer"
                                    >
                                      Fund and Start Milestone
                                    </Button>
                                  )}
                                  {role === "COMPANY" && nextMilestone.status === "IN_PROGRESS" && (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(nextMilestone.id, "COMPLETED")}
                                      size="sm"
                                      variant="primary"
                                      className="text-xs py-1 h-7 font-medium cursor-pointer bg-[#152C55] hover:bg-[#EAF1FE] text-white"
                                    >
                                      Approve and Release Funds
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </Card>

                      {/* Recent Activity Feed */}
                      <Card className="border border-[#E3E5EA] p-5 bg-white rounded-lg">
                        <div className="flex justify-between items-center pb-3 border-b border-[#E3E5EA]">
                          <h3 className="text-xs font-medium uppercase text-[#5B6272] tracking-wider">Recent Workspace Activity</h3>
                          <span className="text-[11px] text-[#5B6272] font-medium">Auto Synced</span>
                        </div>
                        <div className="mt-4 space-y-4 max-h-[280px] overflow-y-auto pr-1">
                          
                          {/* Aggregate logs chronologically */}
                          {(() => {
                            const logs: { id: string; type: string; title: string; desc: string; date: Date }[] = [];
                            updates.forEach(u => logs.push({ id: u.id, type: "milestone", title: `Milestone Status: ${u.status.replace("_", " ")}`, desc: u.title, date: new Date(u.createdAt) }));
                            tasks.forEach(t => logs.push({ id: t.id, type: "task", title: `Task: ${t.status}`, desc: t.title, date: new Date(t.createdAt) }));
                            files.forEach(f => logs.push({ id: f.id, type: "file", title: "Deliverable Shared", desc: f.fileName, date: new Date(f.uploadedAt) }));
                            
                            // Sort logs descending
                            logs.sort((a, b) => b.date.getTime() - a.date.getTime());

                            if (logs.length === 0) {
                              return (
                                <p className="text-xs text-[#5B6272] py-6 text-center">No activity logged in this workspace yet.</p>
                              );
                            }
 
                            return logs.slice(0, 6).map((log, idx) => (
                              <div key={`${log.id}-${idx}`} className="flex gap-3 text-xs leading-relaxed items-start">
                                <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center bg-[#F8F9FB] border border-[#E3E5EA] text-[#1A1D29]">
                                  {log.type === "milestone" && <Sparkles className="h-3 w-3" />}
                                  {log.type === "task" && <CheckSquare className="h-3 w-3" />}
                                  {log.type === "file" && <Archive className="h-3 w-3" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[#1A1D29] leading-tight">{log.title}</p>
                                  <p className="text-[#5B6272] text-[11px] mt-0.5 truncate">{log.desc}</p>
                                </div>
                                <span className="text-[11px] font-medium text-[#5B6272] shrink-0 whitespace-nowrap">
                                  {log.date.toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </Card>

                    </div>

                    {/* Right: Quick circular progress summary */}
                    <div className="space-y-6">
                      <Card className="border border-[#E3E5EA] p-6 flex flex-col items-center justify-center text-center bg-white rounded-lg">
                        <h3 className="text-xs font-medium uppercase text-[#5B6272] tracking-wider mb-6">Contract Status</h3>
                        
                        {/* Circular progress container */}
                        <div className="relative h-28 w-28 flex items-center justify-center">
                          <svg className="absolute h-full w-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="#F7F9FB" strokeWidth="8" fill="transparent" />
                            <circle cx="56" cy="56" r="48" stroke="#181d26" strokeWidth="8" fill="transparent"
                              strokeDasharray={301.6}
                              strokeDashoffset={301.6 - (301.6 * milestonePercentage) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-[#1A1D29] leading-none">{milestonePercentage}%</p>
                            <p className="text-[11px] font-medium text-[#5B6272] uppercase tracking-wider mt-1">Paid</p>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-[#1A1D29] mt-6 leading-tight">
                          {completedMilestones} of {updates.length} Milestone Phases Done
                        </p>
                        <p className="text-[11px] text-[#5B6272] mt-1">
                          Funds are released automatically upon final client milestone approval.
                        </p>
                      </Card>

                      {/* Workspace team profiles short preview */}
                      <Card className="border border-[#C7CBD6] p-5 bg-white rounded-lg space-y-3">
                        <h3 className="text-xs font-medium uppercase text-[#5B6272] tracking-wider">Collaborators</h3>
                        
                        <div className="space-y-3 pt-1 text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              onClick={() => {
                                router.push(`/companies/${companyUser.companyId}`);
                              }}
                              className="h-7 w-7 rounded-full bg-[#152C55] flex items-center justify-center font-medium text-[11px] text-white overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              {companyUser.image ? (
                                <img src={companyUser.image} className="h-full w-full object-cover" />
                              ) : (
                                "C"
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                onClick={() => {
                                  router.push(`/companies/${companyUser.companyId}`);
                                }}
                                className="font-semibold text-[#1A1D29] truncate cursor-pointer hover:underline hover:text-[#2159C9]"
                              >
                                {companyName}
                              </p>
                              <p className="text-[11px] font-medium text-[#5B6272] uppercase leading-none mt-0.5">Client</p>
                            </div>
                          </div>
                          {/* Freelancers */}
                          {hiredFreelancers.map(f => (
                            <div key={f.id} className="flex items-center gap-2">
                              <div
                                onClick={() => {
                                  router.push(`/freelancers/${f.freelancerId}`);
                                }}
                                className="h-7 w-7 rounded-full bg-[#152C55] text-white font-medium flex items-center justify-center text-[11px] overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                {f.image ? (
                                  <img src={f.image} className="h-full w-full object-cover" />
                                ) : (
                                  f.name ? f.name[0].toUpperCase() : "F"
                                )}
                              </div>
                              <div className="min-w-0">
                                <p
                                  onClick={() => {
                                    router.push(`/freelancers/${f.freelancerId}`);
                                  }}
                                  className="font-semibold text-[#1A1D29] truncate cursor-pointer hover:underline hover:text-[#2159C9]"
                                >
                                  {f.name}
                                </p>
                                <p className="text-[11px] font-medium text-[#5B6272] uppercase leading-none mt-0.5">Freelancer</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                  </div>

                </div>
              )}

              {/* messages TAB */}
              {activeView === "messages" && (
                <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[400px]">
                    {/* Left: Sub-sidebar for channels and DMs */}
                  <div className={`w-full lg:w-[280px] shrink-0 bg-white border border-[#E3E5EA] rounded-lg p-4 space-y-5 flex flex-col justify-start overflow-y-auto ${showMobileChatSidebar ? "flex" : "hidden lg:flex"}`}>
                    {/* Channels section */}
                    <div className="space-y-1 bg-[#F8F9FB] p-3.5 rounded-lg border border-[#E3E5EA]">
                      <h4 className="text-[11px] font-medium text-[#1A1D29] uppercase tracking-wider pl-1 mb-2">Channels</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChannel("group");
                          setShowMobileChatSidebar(false);
                        }}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-xs font-medium text-left transition-all cursor-pointer border ${
                          activeChannel === "group"
                            ? "bg-[#152C55] text-white border-transparent"
                            : "text-[#5B6272] hover:bg-[#ffffff] hover:text-[#1A1D29] border-transparent"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-[#152C55] flex items-center justify-center font-medium text-xs text-white shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs truncate">Group Chat</p>
                          <p className="text-[11px] opacity-75 font-medium uppercase tracking-wider mt-0.5">Public Channel</p>
                        </div>
                      </button>
 
                      {role === "FREELANCER" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChannel("freelancers");
                            setShowMobileChatSidebar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-xs font-medium text-left transition-all cursor-pointer mt-1 border ${
                            activeChannel === "freelancers"
                              ? "bg-[#152C55] text-white border-transparent"
                              : "text-[#5B6272] hover:bg-[#ffffff] hover:text-[#1A1D29] border-transparent"
                          }`}
                          title="Only hired freelancers can view this private channel"
                        >
                          <div className="h-8 w-8 rounded-full bg-[#152C55] flex items-center justify-center font-medium text-xs text-white shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate">Freelancers Private</p>
                            <p className="text-[11px] opacity-75 font-medium uppercase tracking-wider mt-0.5">Private Channel</p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Direct Messages section */}
                    <div className="space-y-1 bg-[#F8F9FB] p-3.5 rounded-lg border border-[#E3E5EA] flex-1 overflow-y-auto">
                      <h4 className="text-[11px] font-semibold text-[#1A1D29] uppercase tracking-widest pl-1 mb-2">Direct Messages</h4>
                      
                      {role === "FREELANCER" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChannel(getDMChannelKey(companyUser.id));
                            setShowMobileChatSidebar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-xs font-medium text-left transition-all cursor-pointer border ${
                            activeChannel === getDMChannelKey(companyUser.id)
                              ? "bg-[#F8F9FB] border-[#E3E5EA] text-[#1A1D29]"
                              : "text-[#5B6272] hover:bg-[#F0F3F9] hover:text-[#1A1D29] border-transparent"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-full bg-[#E8F1FE] flex items-center justify-center font-semibold text-xs text-[#1A1D29] shrink-0 overflow-hidden relative">
                            {companyUser.image ? (
                              <img src={companyUser.image} className="h-full w-full object-cover" />
                            ) : (
                              <span>{companyName[0].toUpperCase()}</span>
                            )}
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#14713D] border border-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate">{companyName}</p>
                            <p className="text-[11px] text-[#5B6272] font-medium uppercase tracking-wider mt-0.5">Client Representative</p>
                          </div>
                        </button>
                      )}

                      {role === "FREELANCER"
                        ? hiredFreelancers
                            .filter((f) => f.id !== currentUserId)
                            .map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setActiveChannel(getDMChannelKey(f.id));
                                  setShowMobileChatSidebar(false);
                                }}
                                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-xs font-medium text-left transition-all cursor-pointer mt-1 border ${
                                  activeChannel === getDMChannelKey(f.id)
                                    ? "bg-[#F8F9FB] border-[#C7CBD6] text-[#1A1D29]"
                                    : "text-[#5B6272] hover:bg-[#E8F1FE] hover:text-[#1A1D29] border-transparent"
                                }`}
                              >
                                <div className="h-8 w-8 rounded-full bg-[#152C55] flex items-center justify-center font-semibold text-xs text-white shrink-0 overflow-hidden relative">
                                  {f.image ? (
                                    <img src={f.image} className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{f.name ? f.name[0].toUpperCase() : "U"}</span>
                                  )}
                                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#14713D] border border-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs truncate">{f.name}</p>
                                  <p className="text-[11px] text-[#5B6272] font-medium uppercase tracking-wider mt-0.5">{f.role.toLowerCase()}</p>
                                </div>
                              </button>
                            ))
                        : hiredFreelancers.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                  setActiveChannel(getDMChannelKey(f.id));
                                  setShowMobileChatSidebar(false);
                                }}
                              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-xs font-medium text-left transition-all cursor-pointer mt-1 border ${
                                activeChannel === getDMChannelKey(f.id)
                                  ? "bg-[#F8F9FB] border-[#E3E5EA] text-[#1A1D29]"
                                  : "text-[#5B6272] hover:bg-[#F0F3F9] hover:text-[#1A1D29] border-transparent"
                              }`}
                            >
                              <div className="h-8 w-8 rounded-full bg-[#152C55] flex items-center justify-center font-semibold text-xs text-white shrink-0 overflow-hidden relative">
                                {f.image ? (
                                  <img src={f.image} className="h-full w-full object-cover" />
                                ) : (
                                  <span>{f.name ? f.name[0].toUpperCase() : "U"}</span>
                                )}
                                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#14713D] border border-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs truncate">{f.name}</p>
                                <p className="text-[11px] text-[#5B6272] font-medium uppercase tracking-wider mt-0.5">{f.role.toLowerCase()}</p>
                              </div>
                            </button>
                          ))}
                    </div>
                  </div>

                  {/* Right Chat Interface */}
                  <div className={`flex-1 flex flex-col bg-white border border-[#E3E5EA]/60 rounded-lg overflow-hidden relative ${!showMobileChatSidebar ? "flex" : "hidden lg:flex"}`}>
                    
                    {/* Chat Header */}
                    <div className="px-5 py-3 border-b border-[#E3E5EA] bg-[#F8F9FB]/50 flex justify-between items-center shrink-0">
                      <div className="flex items-center min-w-0 gap-3">
                        {/* WhatsApp mobile back button */}
                        {!showMobileChatSidebar && (
                          <button
                            type="button"
                            onClick={() => setShowMobileChatSidebar(true)}
                            className="p-1.5 text-[#5B6272] hover:text-[#1A1D29] rounded-full bg-[#E8F1FE] hover:bg-[#FFF3DC] transition-all lg:hidden cursor-pointer flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shrink-0"
                          >
                            &larr; Chats
                          </button>
                        )}

                        {/* Profile Image / Group Icon next to name inside Header */}
                        {(() => {
                          const getActiveChannelHeaderInfo = () => {
                            if (activeChannel === "group") {
                              return {
                                name: "Group Chat",
                                detail: "Whole Group Discussion Thread",
                                image: null,
                                isGroup: true,
                                bg: "bg-[#152C55]",
                                icon: <Users className="h-4 w-4 text-white" />
                              };
                            }
                            if (activeChannel === "freelancers") {
                              return {
                                name: "Freelancers Private",
                                detail: "Private Freelancers-Only Thread",
                                image: null,
                                isGroup: true,
                                bg: "bg-[#96620A]",
                                icon: <Users className="h-4 w-4 text-white" />
                              };
                            }
                            if (activeChannel.startsWith("dm:")) {
                              const targetId = activeChannel.slice(3);
                              if (companyUser.id === targetId) {
                                return {
                                  name: companyName,
                                  detail: "Client Representative",
                                  image: companyUser.image,
                                  isGroup: false,
                                  bg: "bg-[#EAF1FE]",
                                  initial: companyName[0].toUpperCase()
                                };
                              }
                              const freelancer = hiredFreelancers.find(f => f.id === targetId);
                              return {
                                name: freelancer?.name || "User",
                                detail: freelancer?.role.toLowerCase() || "Workspace Professional",
                                image: freelancer?.image,
                                isGroup: false,
                                bg: "bg-[#152C55]",
                                initial: freelancer?.name ? freelancer.name[0].toUpperCase() : "U"
                              };
                            }
                            return {
                              name: "Chat Thread",
                              detail: "Direct messaging thread",
                              image: null,
                              isGroup: false,
                              bg: "bg-[#152C55]",
                              initial: "C"
                            };
                          };
                          const headerInfo = getActiveChannelHeaderInfo();
                          const handleHeaderClick = () => {
                             if (activeChannel.startsWith("dm:")) {
                               const targetId = activeChannel.slice(3);
                               const freelancer = hiredFreelancers.find(f => f.id === targetId);
                               if (freelancer) {
                                 router.push(`/freelancers/${freelancer.freelancerId}`);
                               } else if (targetId === companyUser.id) {
                                 router.push(`/companies/${companyUser.companyId}`);
                               }
                             }
                           };
                           const isClickableDM = activeChannel.startsWith("dm:") && (hiredFreelancers.some(f => f.id === activeChannel.slice(3)) || activeChannel.slice(3) === companyUser.id);
                          return (
                            <>
                              <div
                                 onClick={handleHeaderClick}
                                 className={`h-9 w-9 rounded-full ${headerInfo.bg} flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden relative ${
                                   isClickableDM ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                                 }`}
                               >
                                {headerInfo.isGroup ? (
                                  headerInfo.icon
                                ) : headerInfo.image ? (
                                  <img src={headerInfo.image} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[#5B6272] font-bold">{headerInfo.initial}</span>
                                )}
                                {!headerInfo.isGroup && (
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#14713D] border-2 border-white animate-pulse" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3
                                   onClick={handleHeaderClick}
                                   className={`text-sm font-bold text-[#1A1D29] truncate ${
                                     isClickableDM ? "cursor-pointer hover:underline hover:text-[#2159C9]" : ""
                                   }`}
                                 >
                                  {headerInfo.name}
                                </h3>
                                <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider mt-0.5 truncate">
                                  {headerInfo.detail}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* AI Assistant Button */}
                      <button
                        type="button"
                        onClick={() => setShowAIAssistant(!showAIAssistant)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          showAIAssistant 
                            ? "bg-[#152C55] border-[#1A1D29] text-white"
                            : "bg-white border-[#E3E5EA] text-[#5B6272] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">AI Assistant</span>
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      
                      <div className="px-4 py-2 rounded-lg bg-[#FFF3DC]/60 border border-[#F5DEB0]/30 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[#8F5E08] shrink-0" />
                        <p className="text-[11px] font-bold text-[#8F5E08] uppercase tracking-wide">
                          Important: Messages automatically clear after 7 days to maintain clean workspaces.
                        </p>
                      </div>

                      {messages.filter((m) => m.channel === activeChannel).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-[#5B6272] space-y-2 p-8">
                          <MessageSquare className="h-8 w-8 text-[#5B6272]" />
                          <p className="text-xs font-bold">Workspace thread is quiet.</p>
                          <p className="text-[11px]">Send a greeting message or files to begin collaboration.</p>
                        </div>
                      ) : (
                        messages.filter((m) => m.channel === activeChannel).map((msg) => {
                          const isMe = msg.senderId === currentUserId;
                          const isVoice = msg.content.startsWith("[VOICE:");
                          const isFile = msg.content.startsWith("[FILE:");

                          // Extract voice metadata
                          let voiceDur = "0:00";
                          if (isVoice) {
                            const durMatch = msg.content.match(/duration:([^\]]+)/);
                            if (durMatch) voiceDur = durMatch[1];
                          }
                          
                          // Extract file metadata
                          let fileDetails = { name: "", url: "", size: "" };
                          if (isFile) {
                            const match = msg.content.match(/^\[FILE:(.+)\|(.+)\|(.+)\]$/);
                            if (match) {
                              fileDetails = { name: match[1], url: match[2], size: match[3] };
                            }
                          }
                          const freelancerInfo = hiredFreelancers.find(f => f.id === msg.senderId);
                          const isFreelancerSender = !!freelancerInfo;
                          const handleSenderClick = () => {
                             if (isFreelancerSender) {
                               router.push(`/freelancers/${freelancerInfo.freelancerId}`);
                             } else if (msg.senderId === companyUser.id) {
                               router.push(`/companies/${companyUser.companyId}`);
                             }
                           };

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                            >
                              {/* Avatar */}
                              <div
                                 onClick={handleSenderClick}
                                 className={`h-8 w-8 rounded-full bg-[#152C55] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden ${
                                   isFreelancerSender || msg.senderId === companyUser.id ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                                 }`}
                               >
                                {msg.sender.image ? <img src={msg.sender.image} className="h-full w-full object-cover" /> : (msg.sender.name ? msg.sender.name[0].toUpperCase() : "U")}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className={`flex items-center gap-1.5 text-[11px] font-bold text-[#5B6272] uppercase ${isMe ? "justify-end" : ""}`}>
                                  <span
                                     onClick={handleSenderClick}
                                     className={isFreelancerSender || msg.senderId === companyUser.id ? "cursor-pointer hover:underline hover:text-[#2159C9]" : ""}
                                   >
                                     {msg.sender.name}
                                   </span>
                                  <span className="text-[7px] bg-[#E8F1FE] text-[#5B6272] px-1 rounded-full tracking-wider">{msg.sender.role.toLowerCase()}</span>
                                </div>

                                {/* Bubble content */}
                                <div className={`p-3.5 rounded-lg text-xs leading-relaxed break-words ${
                                  isMe
                                    ? "bg-[#2E6BEA] text-white rounded-tr-none"
                                    : "bg-[#F0F3F9] text-[#1A1D29] rounded-tl-none border border-[#E3E5EA]/50"
                                }`}>
                                  {isVoice ? (
                                    <VoiceMessagePlayer content={msg.content} isMe={isMe} />
                                  ) : isFile ? (
                                    <div className="flex flex-col gap-2 p-1 max-w-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 text-white shrink-0">
                                          <Archive className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-xs truncate" title={fileDetails.name}>
                                            {fileDetails.name}
                                          </p>
                                          <p className="text-[11px] opacity-75 font-semibold mt-0.5">
                                            {fileDetails.size}
                                          </p>
                                        </div>
                                      </div>
                                      <a
                                        href={fileDetails.url}
                                        download={fileDetails.name}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 mt-1.5 rounded-full text-[11px] font-bold uppercase transition-all cursor-pointer ${
                                          isMe 
                                            ? "bg-white text-[#1A1D29] hover:bg-[#F8F9FB]" 
                                            : "bg-[#152C55] text-white hover:bg-[#FFF3DC]"
                                        }`}
                                      >
                                        <Download className="h-3 w-3" />
                                        Download File
                                      </a>
                                    </div>
                                  ) : (
                                    msg.content
                                  )}
                                </div>

                                <div className={`text-[11px] text-[#5B6272] flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : ""}`}>
                                  <Clock className="h-2.5 w-2.5 text-[#5B6272]" />
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  {isMe && (
                                    <>
                                      <span>·</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="text-[#BC2A2A] hover:text-[#BC2A2A] underline font-bold cursor-pointer transition-colors border-none bg-transparent p-0"
                                      >
                                        Delete
                                      </button>
                                      <span className="ml-1 flex items-center">
                                        {msg.seen ? (
                                          <div className="flex animate-fade-in" title="Seen by recipient">
                                            <svg className="h-3 w-3 text-[#2159C9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <svg className="h-3 w-3 text-[#2159C9] -ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        ) : (
                                          <svg className="h-3 w-3 text-[#5B6272]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                            <title>Sent</title>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </div>

                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* WS-009 — simulated recording overlay removed. */}
                    {/* Chat Input form bar */}
                    <form onSubmit={(e) => handleSendMessage(e)} className="p-3.5 bg-[#F8F9FB] border-t border-[#E3E5EA] flex gap-2 items-center shrink-0">
                      <input
                        type="file"
                        ref={chatFileInputRef}
                        onChange={(e) => handleChatFileAttach(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        disabled={isUploadingChatFile}
                        className="p-2.5 bg-white hover:bg-[#E8F1FE] text-[#5B6272] border border-[#E3E5EA]/80 rounded-full cursor-pointer transition-all"
                        title="Upload file attachment"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      {/* WS-009 — the microphone button never captured audio; it started a
                          timer and animated waveform, then emitted a text token. Removed
                          rather than left looking functional. */}
                      <Input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type message here..."
                        disabled={isSendingMessage || isUploadingFile}
                        className="flex-1 bg-white text-xs border-[#C7CBD6]/80 text-[#1A1D29]"
                      />
                      <Button
                        type="submit"
                        disabled={isSendingMessage || !newMessage.trim() || isUploadingFile}
                        className="bg-[#152C55] hover:bg-[#EAF1FE] text-white font-bold text-xs h-9 cursor-pointer flex items-center gap-1"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send</span>
                      </Button>
                    </form>
                  </div>

                  {/* AI Assistant Chat pane */}
                  {showAIAssistant && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="w-full lg:w-[320px] bg-[#E8F1FE]/95 lg:bg-[#E8F1FE]/70 border border-[#E3E5EA]/60 rounded-lg p-4 flex flex-col h-full shadow-md absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-[#E3E5EA]/60">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#1A1D29]" />
                          <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">Talentra AI Chat</h3>
                        </div>
                        <button type="button" onClick={() => setShowAIAssistant(false)} className="text-[#5B6272] hover:text-[#5B6272]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* WS-009 — the assistant was keyword-matched canned replies with
                          no model behind it. Replaced with a plain statement of
                          unavailability rather than a simulation. */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <Sparkles className="h-6 w-6 text-[#5B6272]" />
                        <span className="text-xs font-bold text-[#1A1D29]">Assistant not available</span>
                        <p className="text-[11px] text-[#5B6272] leading-relaxed max-w-[220px]">
                          The workspace assistant is not implemented yet. Project figures are
                          shown on the Overview and Funding tabs.
                        </p>
                      </div>
                    </motion.div>
                  )}

                </div>
              )}

              {/* deliverables TAB */}
              {activeView === "deliverables" && (
                <div className="space-y-6">
                  
                  <div className="flex justify-between items-center pb-3 border-b border-[#E3E5EA]/60">
                    <div>
                      <h2 className="text-base font-bold text-[#1A1D29]">Workspace Deliverables</h2>
                      <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">
                        Upload final files, track version iterations, and request revisions.
                      </p>
                    </div>
                    {role === "FREELANCER" && (
                      <div>
                        <input
                          type="file"
                          ref={deliverableFileInputRef}
                          onChange={(e) => handleFileUpload(e, deliverableVersionTargetId || undefined)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => { setDeliverableVersionTargetId(null); deliverableFileInputRef.current?.click(); }}
                          disabled={isUploadingFile}
                          className="bg-[#152C55] hover:bg-[#F0F3F9] text-white font-bold text-xs h-8 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Submit Deliverable</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {files.length === 0 ? (
                    <div className="py-20 text-center text-[#5B6272] space-y-3">
                      <div className="h-12 w-12 rounded-full bg-[#E8F1FE] border border-[#E3E5EA] flex items-center justify-center mx-auto text-[#5B6272]">
                        <Archive className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-[#5B6272]">No deliverables shared yet.</p>
                      <p className="text-[11px] max-w-xs mx-auto">
                        Freelancers can submit final documents or files here for review, revision tracking, and final budget release.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {files.map((file) => {
                        const meta = parseDeliverableMeta(file.fileSize);
                        return (
                          <Card key={file.id} className="border border-[#C7CBD6]/60 p-5 bg-white relative hover:shadow-md transition-all flex flex-col justify-between gap-4">
                            
                            {/* Version and status header */}
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-[#1A1D29] bg-[#EAF1FE]/20 px-2 py-0.5 rounded-full border border-[#E3E5EA]/30 text-[11px] uppercase tracking-wider">
                                Version v{meta.version}
                              </span>
                              <Badge
                                variant={
                                  meta.status === "APPROVED"
                                    ? "success"
                                    : meta.status === "REVISION_REQUESTED"
                                    ? "danger"
                                    : "warning"
                                }
                                className="text-[11px] font-bold uppercase tracking-wider px-2"
                              >
                                {meta.status.replace("_", " ")}
                              </Badge>
                              {/* Revision budget — shown to both sides, not just the
                                  client, so a freelancer knows how many rounds remain. */}
                              {meta.revisionCount > 0 && (
                                <span
                                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    meta.revisionCount >= meta.revisionCap
                                      ? "bg-danger-surface text-danger border-danger-border"
                                      : "bg-warning-surface text-warning border-warning-border"
                                  }`}
                                  title={
                                    meta.revisionCount >= meta.revisionCap
                                      ? "No revision rounds remaining"
                                      : `${meta.revisionCap - meta.revisionCount} revision round(s) remaining`
                                  }
                                >
                                  Revision {meta.revisionCount} of {meta.revisionCap}
                                </span>
                              )}
                            </div>

                            {/* File Name & details */}
                            <div className="min-w-0 py-2">
                              <h4 className="font-bold text-[#1A1D29] truncate text-sm" title={file.fileName}>
                                {file.fileName}
                              </h4>
                              <p className="text-[11px] text-[#5B6272] mt-1">
                                Size: {meta.size} • Shared: {formatTimestamp(file.uploadedAt)}
                              </p>
                              {meta.feedback && (
                                <div className="mt-3 p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E3E5EA] text-[11px] leading-relaxed text-[#5B6272] max-h-[80px] overflow-y-auto">
                                  <strong className="block text-[#5B6272] font-bold uppercase text-[11px] tracking-wider mb-0.5">Feedback:</strong>
                                  {meta.feedback}
                                </div>
                              )}
                            </div>

                            {/* Actions bar */}
                            <div className="pt-3 border-t border-[#E3E5EA] flex items-center justify-between text-xs mt-auto">
                              
                              <div className="flex items-center gap-1.5">
                                {/* Download */}
                                <a
                                  href={file.fileUrl}
                                  download={file.fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-full border border-[#E3E5EA] bg-white hover:bg-[#F8F9FB] text-[#5B6272] hover:text-[#1A1D29] transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                                {/* Preview */}
                                <button
                                  onClick={() => setSelectedPreviewFile(file)}
                                  className="p-1.5 rounded-full border border-[#E3E5EA] bg-white hover:bg-[#F8F9FB] text-[#5B6272] hover:text-[#1A1D29] transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Preview File"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                {/* Delete */}
                                {(role === "COMPANY" || file.uploadedById === currentUserId) && (
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-1.5 rounded-full border border-[#E3E5EA] bg-white hover:bg-[#FDEAEA] text-[#5B6272] hover:text-[#BC2A2A] transition-all cursor-pointer inline-flex items-center justify-center"
                                    title="Delete Deliverable"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Upload new version / Review buttons */}
                              <div className="flex items-center gap-1.5">
                                {role === "FREELANCER" && meta.status === "REVISION_REQUESTED" && (
                                  <Button
                                    onClick={() => {
                                      setDeliverableVersionTargetId(file.id);
                                      deliverableFileInputRef.current?.click();
                                    }}
                                    size="xs"
                                    variant="secondary"
                                    className="text-[11px] font-bold uppercase tracking-wider py-1 h-7 cursor-pointer"
                                  >
                                    Submit New Version
                                  </Button>
                                )}
                                {role === "COMPANY" && meta.status === "PENDING" && (
                                  <Button
                                    onClick={() => setSelectedPreviewFile(file)}
                                    size="xs"
                                    variant="primary"
                                    className="text-[11px] font-bold uppercase tracking-wider py-1 h-7 cursor-pointer"
                                  >
                                    Audit Review
                                  </Button>
                                )}
                              </div>

                            </div>

                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Lightbox / Preview & Review Modal */}
                  {selectedPreviewFile && (
                    <Modal open onClose={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }} size="2xl">
                      <div className="space-y-4">
                        <div className="h-1.5 bg-[#152C55]" />
                        
                        <div className="p-6 space-y-4 text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] bg-[#F8F9FB] text-[#1A1D29] border border-[#E3E5EA] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                                File Previewer Lightbox
                              </span>
                              <h3 className="font-semibold text-[#1A1D29] text-base truncate mt-1 max-w-[400px]">
                                {selectedPreviewFile.fileName}
                              </h3>
                            </div>
                            <button
                              onClick={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }}
                              className="text-[#5B6272] hover:text-[#5B6272] cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Simulated Sandbox File Previewer */}
                          <div className="h-[240px] bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg overflow-hidden flex items-center justify-center">
                            {selectedPreviewFile.fileName.endsWith(".png") || selectedPreviewFile.fileName.endsWith(".jpg") || selectedPreviewFile.fileName.endsWith(".jpeg") ? (
                              <img src={selectedPreviewFile.fileUrl} className="h-full w-full object-contain" alt="Preview Image" />
                            ) : selectedPreviewFile.fileName.endsWith(".js") || selectedPreviewFile.fileName.endsWith(".ts") || selectedPreviewFile.fileName.endsWith(".tsx") || selectedPreviewFile.fileName.endsWith(".html") || selectedPreviewFile.fileName.endsWith(".json") ? (
                              <div className="w-full h-full p-4 font-mono text-[11px] text-white/75 leading-normal overflow-y-auto whitespace-pre bg-[#152C55] border-none text-left">
                                <span className="text-[#147A44] font-bold block">// talentra workspace deliverable sandbox viewer</span>
                                <span className="text-[#2159C9]">import</span> React <span className="text-[#2159C9]">from</span> <span className="text-[#8F5E08]">"react"</span>;{"\n"}
                                <span className="text-[#2159C9]">export default function</span> Component() &#123;{"\n"}
                                {"  "}return ({"\n"}
                                {"    "}&lt;<span className="text-[#2159C9]">div</span> className=<span className="text-[#8F5E08]">"workspace-render"</span>&gt;{"\n"}
                                {"      "}&lt;<span className="text-[#2159C9]">h1</span>&gt;Redesigned Page Sandbox Preview Successfully Loaded&lt;/<span className="text-[#2159C9]">h1</span>&gt;{"\n"}
                                {"    "}&lt;/<span className="text-[#2159C9]">div</span>&gt;{"\n"}
                                {"  "});{"\n"}
                                &#125;;
                              </div>
                            ) : (
                              <div className="text-center p-6 space-y-2">
                                <Archive className="h-10 w-10 text-[#2159C9] mx-auto" />
                                <p className="text-xs font-bold text-[#5B6272]">Document Sandbox Viewer</p>
                                <p className="text-[11px] text-[#5B6272]">
                                  File: {selectedPreviewFile.fileName} ({parseDeliverableMeta(selectedPreviewFile.fileSize).size})
                                </p>
                                <a
                                  href={selectedPreviewFile.fileUrl}
                                  download
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F1FE] hover:bg-[#FFF3DC] border border-[#E3E5EA] text-[#1A1D29] font-bold text-[11px] mt-2 cursor-pointer"
                                >
                                  <Download className="h-3 w-3" /> Download to view contents
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Client review feedback form details */}
                          {role === "COMPANY" && parseDeliverableMeta(selectedPreviewFile.fileSize).status === "PENDING" ? (
                            <div className="space-y-3 pt-3 border-t border-[#E3E5EA]">
                              <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">
                                Audit Review Feedback (Required)
                              </label>
                              <textarea
                                value={reviewFeedback}
                                onChange={(e) => setReviewFeedback(e.target.value)}
                                placeholder="State review approval remarks or specific revision requests guidelines..."
                                rows={2.5}
                                className="w-full px-3 py-2 rounded-md border border-[#C7CBD6] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-xs text-[#1A1D29] bg-white"
                              />
                              <div className="flex justify-between items-center gap-2 pt-1 text-xs">
                                {(() => {
                                  const m = parseDeliverableMeta(selectedPreviewFile.fileSize);
                                  const left = m.revisionCap - m.revisionCount;
                                  return (
                                    <span
                                      className={`text-[11px] font-medium ${
                                        left <= 0 ? "text-danger" : "text-muted"
                                      }`}
                                    >
                                      {left <= 0
                                        ? `No revision rounds left (${m.revisionCap} of ${m.revisionCap} used)`
                                        : `Revision ${m.revisionCount} of ${m.revisionCap} used — ${left} left`}
                                    </span>
                                  );
                                })()}
                                <div className="flex gap-2">
                                <Button
                                  onClick={() => handleReviewDeliverable(selectedPreviewFile.id, "REVISION_REQUESTED")}
                                  disabled={
                                    isReviewing ||
                                    !reviewFeedback.trim() ||
                                    parseDeliverableMeta(selectedPreviewFile.fileSize).revisionCount >=
                                      parseDeliverableMeta(selectedPreviewFile.fileSize).revisionCap
                                  }
                                  title={
                                    parseDeliverableMeta(selectedPreviewFile.fileSize).revisionCount >=
                                    parseDeliverableMeta(selectedPreviewFile.fileSize).revisionCap
                                      ? "Revision limit reached — approve or renegotiate"
                                      : undefined
                                  }
                                  className="bg-[#FDEAEA] border border-[#F5C2C2] text-[#BC2A2A] hover:bg-[#FDEAEA]/50 text-[11px] font-bold uppercase tracking-wider px-4 cursor-pointer disabled:opacity-50"
                                >
                                  Request Revisions
                                </Button>
                                <Button
                                  onClick={() => handleReviewDeliverable(selectedPreviewFile.id, "APPROVED")}
                                  disabled={isReviewing || !reviewFeedback.trim()}
                                  className="bg-[#14713D] hover:bg-[#14713D] text-white text-[11px] font-bold uppercase tracking-wider px-4 cursor-pointer"
                                >
                                  Approve Submission
                                </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-2 text-xs">
                              <Button
                                onClick={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }}
                                className="bg-[#F0F3F9] hover:bg-[#EAF1FE] text-[#5B6272] font-bold px-4 cursor-pointer"
                              >
                                Close
                              </Button>
                            </div>
                          )}

                        </div>
                      </div>
                    </Modal>
                  )}

                </div>
              )}

              {/* tasks TAB */}
              {activeView === "tasks" && (
                <div className="space-y-6">
                  
                  {/* Kanban toolbar */}
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-3.5 border-b border-[#E3E5EA]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div>
                        <h2 className="text-base font-bold text-[#1A1D29]">
                          {taskViewMode === "board" ? "Kanban Board" : "Freelancer Work Ledger"}
                        </h2>
                        <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">
                          {taskViewMode === "board" 
                            ? "Coordinate execution cycles and audit progress indicators." 
                            : "Observe completed tasks chronologically by completion date."}
                        </p>
                      </div>

                      {/* View Switcher Toggle */}
                      <div className="flex items-center gap-1.5 bg-[#E8F1FE]/80 p-1 rounded-lg w-fit shrink-0">
                        <button
                          type="button"
                          onClick={() => setTaskViewMode("board")}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            taskViewMode === "board"
                              ? "bg-white text-[#1A1D29]"
                              : "text-[#5B6272] hover:text-[#1A1D29]"
                          }`}
                        >
                          Kanban Board
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskViewMode("timeline")}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            taskViewMode === "timeline"
                              ? "bg-white text-[#1A1D29]"
                              : "text-[#5B6272] hover:text-[#1A1D29]"
                          }`}
                        >
                          Work Timeline
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 text-xs items-center justify-between sm:justify-end w-full md:w-auto">
                      <div className="relative w-full sm:w-48 shrink-0">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5B6272]" />
                        <Input
                          type="text"
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          placeholder="Search tasks..."
                          className="pl-8 bg-white h-8 text-[11px] border-[#E3E5EA]/80"
                        />
                      </div>
                      <Button
                        onClick={() => setShowAddTaskModal(true)}
                        className="bg-[#152C55] hover:bg-[#E8F1FE] text-white font-bold text-xs h-8 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Task</span>
                      </Button>
                    </div>
                  </div>

                  {taskViewMode === "board" ? (
                    /* Kanban Grid */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      
                      {/* Columns mapping TODO, IN_PROGRESS, DONE */}
                      {TASK_COLUMNS.map(({ id: col, label: colLabel }) => {
                        const colTasks = filteredTasksList.filter(t => t.status === col);
                        return (
                          <div key={col} className="bg-[#F0F3F9]/40 border border-[#E3E5EA]/40 rounded-lg p-4 flex flex-col min-h-[440px]">
                            
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E5EA]/50 mb-3.5">
                              <span className="text-xs font-semibold uppercase text-[#5B6272] tracking-wider">
                                {colLabel}
                              </span>
                              <Badge variant="neutral" className="px-2">{colTasks.length}</Badge>
                            </div>

                            {/* Task Cards Container */}
                            <div className="flex-1 space-y-3.5">
                              {colTasks.length === 0 ? (
                                <div className="border border-dashed border-[#E3E5EA] rounded-lg py-12 text-center text-[#5B6272] text-[11px] font-bold uppercase tracking-wider">
                                  Empty Column
                                </div>
                              ) : (
                                colTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setShowTaskDetailModal(true); }}
                                    className="bg-white border border-[#E3E5EA]/60 rounded-lg p-4 hover:shadow-md hover:border-[#C7CBD6]/50 transition-all cursor-pointer group flex flex-col gap-3"
                                  >
                                    <div className="flex justify-between items-start gap-2.5">
                                      <h4 className="text-xs font-bold text-[#1A1D29] group-hover:text-[#1A1D29] transition-colors leading-snug line-clamp-2">
                                        {task.title}
                                      </h4>
                                      <Badge
                                        className="text-[7px] font-bold uppercase tracking-wider px-1.5 shrink-0"
                                        variant={
                                          task.priority === "HIGH"
                                            ? "danger"
                                            : task.priority === "MEDIUM"
                                            ? "primary"
                                            : "neutral"
                                        }
                                      >
                                        {task.priority}
                                      </Badge>
                                    </div>

                                    {task.description && (
                                      <p className="text-[11px] text-[#5B6272] line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Card Footer: details and status cycles */}
                                    <div className="flex justify-between items-center pt-3 border-t border-[#E3E5EA] text-[11px] text-[#5B6272]">
                                      
                                      <div className="flex items-center gap-1">
                                        {task.dueDate ? (
                                          <>
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span className={isOverdue(task) ? "text-[#BC2A2A] font-bold" : undefined}>
                                              {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                                              {isOverdue(task) ? " · Overdue" : ""}
                                            </span>
                                          </>
                                        ) : (
                                          <span>No due date</span>
                                        )}
                                      </div>

                                      {/* Action tags to move task column */}
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {col !== "TODO" && (
                                          <button
                                            onClick={() => handleUpdateTaskStatus(task.id, adjacentTaskStatus(col, "back"))}
                                            className="p-1 rounded-full bg-[#E8F1FE] hover:bg-[#FFF3DC] text-[#5B6272] transition-all"
                                            title="Move Left"
                                          >
                                            &larr;
                                          </button>
                                        )}
                                        {col !== "DONE" && (
                                          <button
                                            onClick={() => handleUpdateTaskStatus(task.id, adjacentTaskStatus(col, "forward"))}
                                            className="p-1 rounded-full bg-[#E8F1FE] hover:bg-[#EAF1FE] text-[#5B6272] transition-all font-bold"
                                            title="Move Right"
                                          >
                                            &rarr;
                                          </button>
                                        )}
                                      </div>

                                      {/* Assignee info */}
                                      {task.assignedTo ? (
                                        <div className="flex items-center gap-1.5 shrink-0 bg-[#F8F9FB] border border-[#E3E5EA]/60 rounded-lg py-0.5 pl-0.5 pr-2">
                                          <div className="h-5 w-5 rounded-full bg-[#152C55] border border-[#E3E5EA] flex items-center justify-center font-bold text-[11px] overflow-hidden text-white shrink-0">
                                            {task.assignedTo.image ? (
                                              <img src={task.assignedTo.image} alt={task.assignedTo.name || ""} className="h-full w-full object-cover" />
                                            ) : (
                                              task.assignedTo.name ? task.assignedTo.name[0].toUpperCase() : "U"
                                            )}
                                          </div>
                                          <span className="text-[11px] font-bold text-[#5B6272] truncate max-w-[70px]">
                                            {task.assignedTo.name?.split(" ")[0] || "User"}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-[8.5px] font-bold text-[#5B6272] uppercase tracking-wider">
                                          <div className="h-5 w-5 rounded-full border border-dashed border-[#E3E5EA] flex items-center justify-center shrink-0 bg-white">
                                            <User className="h-2.5 w-2.5 text-[#2159C9]" />
                                          </div>
                                          <span>Unassigned</span>
                                        </div>
                                      )}

                                    </div>

                                  </div>
                                ))
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Date-wise completed timeline done by freelancers */
                    <div className="space-y-6">
                      {/* Freelancer Filter Dashboard */}
                      <div className="bg-white border border-[#E3E5EA]/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <span className="text-[11px] font-bold text-[#1A1D29] uppercase tracking-wider block">Freelancer Activity Dashboard</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Filter badge for ALL */}
                            <button
                              type="button"
                              onClick={() => setSelectedFreelancerFilter("all")}
                              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedFreelancerFilter === "all"
                                  ? "bg-[#152C55] border-[#1A1D29] text-white font-bold"
                                  : "bg-[#F8F9FB] border-[#C7CBD6] text-[#5B6272] hover:bg-[#F0F3F9]"
                              }`}
                            >
                              <span>All Freelancers</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                                selectedFreelancerFilter === "all" ? "bg-white/20 text-white" : "bg-[#E8F1FE]/60 text-[#5B6272]"
                              }`}>
                                {tasks.filter(t => t.status === "DONE").length}
                              </span>
                            </button>

                            {/* Dynamic buttons for each hired freelancer */}
                            {hiredFreelancers.map((freelancer) => {
                              const freelancerDoneCount = tasks.filter(t => t.status === "DONE" && t.assignedToId === freelancer.id).length;
                              return (
                                <button
                                  key={freelancer.id}
                                  type="button"
                                  onClick={() => setSelectedFreelancerFilter(freelancer.id)}
                                  className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    selectedFreelancerFilter === freelancer.id
                                      ? "bg-[#152C55]/10 border-[#1A1D29]/40 text-[#1A1D29] font-bold ring-1 ring-[#152C55]/30"
                                      : "bg-[#F8F9FB] border-[#E3E5EA] text-[#5B6272] hover:bg-[#E8F1FE]"
                                  }`}
                                >
                                  <div className="h-4 w-4 rounded-full bg-[#FFF3DC] overflow-hidden shrink-0 border border-[#E3E5EA]">
                                    {freelancer.image ? (
                                      <img src={freelancer.image} alt={freelancer.name || ""} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="flex items-center justify-center h-full w-full text-[7px] font-bold bg-[#152C55] text-white">
                                        {freelancer.name ? freelancer.name[0].toUpperCase() : "F"}
                                      </span>
                                    )}
                                  </div>
                                  <span>{freelancer.name || "Freelancer"}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    selectedFreelancerFilter === freelancer.id ? "bg-[#152C55]/20 text-[#1A1D29]" : "bg-[#EAF1FE]/60 text-[#5B6272]"
                                  }`}>
                                    {freelancerDoneCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Summary metrics */}
                        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 md:border-l border-[#E3E5EA] md:pl-4">
                          <div className="text-center md:text-left shrink-0">
                            <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-widest block">Total Logged Work</span>
                            <span className="text-lg font-bold text-[#1A1D29]">{completedTasks.length} Done</span>
                          </div>
                          {(selectedFreelancerFilter !== "all" || taskSearch) && (
                            <button
                              type="button"
                              onClick={() => { setSelectedFreelancerFilter("all"); setTaskSearch(""); }}
                              className="text-[11px] font-bold text-[#1A1D29] hover:text-[#5B6272] underline cursor-pointer shrink-0"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display results */}
                      {completedTasks.length === 0 ? (
                        <div className="py-20 text-center text-[#5B6272] space-y-3 bg-white border border-[#E3E5EA]/60 rounded-lg p-8">
                          <div className="h-12 w-12 rounded-full bg-[#F8F9FB] border border-[#C7CBD6] flex items-center justify-center mx-auto text-[#5B6272]">
                            <CheckSquare className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-[#5B6272]">No completed tasks match your criteria.</p>
                          <p className="text-[11px] max-w-xs mx-auto">
                            {tasks.filter(t => t.status === "DONE").length === 0 
                              ? "Freelancer work progress will be logged here chronologically as soon as tasks are moved to the \"Done\" column."
                              : "Try clearing search keywords or resetting active freelancer filters."
                            }
                          </p>
                          {(selectedFreelancerFilter !== "all" || taskSearch) && (
                            <Button
                              type="button"
                              onClick={() => { setSelectedFreelancerFilter("all"); setTaskSearch(""); }}
                              className="text-xs bg-[#F0F3F9] hover:bg-[#E8F1FE] text-[#5B6272] h-8 cursor-pointer mt-2"
                            >
                              Reset Active Filters
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E3E5EA] bg-white p-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6272]">Jump to date</span>
                          <input type="date" value={timelineDate} onChange={(e) => setTimelineDate(e.target.value)} className="rounded-md border border-[#E3E5EA] px-3 py-1.5 text-xs focus:outline-none" />
                          {timelineDate && (
                            <button type="button" onClick={() => setTimelineDate("")} className="cursor-pointer rounded-full border border-[#E3E5EA] px-3 py-1.5 text-[11px] font-semibold text-[#5B6272] hover:bg-[#F8F9FB]">Show all dates</button>
                          )}
                          <span className="ml-auto text-[11px] font-semibold text-[#1A1D29]">{sortedDates.reduce((t, d) => t + groupedTimeline[d].length, 0)} updates</span>
                        </div>
                        {sortedDates.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-[#C7CBD6] bg-white p-6 text-center text-xs font-semibold text-[#5B6272]">No task updates on this date.</p>
                        ) : (
                        <div className="relative border-l border-[#E3E5EA] ml-4 pl-6 py-2 space-y-8">
                          {sortedDates.map((dateStr) => (
                            <div key={dateStr} className="relative space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                              {/* Timeline dot */}
                              <div className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full bg-white border-4 border-[#1A1D29]" />
                              
                              {/* Date Header */}
                              <div className="inline-block bg-[#152C55]/5 border border-[#1A1D29]/10 rounded-lg px-3 py-1">
                                <span className="text-[11px] font-bold text-[#1A1D29] uppercase tracking-wider">
                                  {/* TIME-001/SSR-001 — formatted only here, deterministically,
                                      preserving the previous "Weekday, Month D, YYYY" appearance. */}
                                  {formatDateKey(dateStr, { weekday: true })}
                                </span>
                              </div>

                              {/* Completed tasks list */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupedTimeline[dateStr].map((task) => (
                                  <Card
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setShowTaskDetailModal(true); }}
                                    className="p-4 bg-white border border-[#E3E5EA] hover:border-[#1A1D29]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-[#1A1D29] text-xs group-hover:text-[#1A1D29] transition-colors leading-tight line-clamp-1">
                                          {task.title}
                                        </h4>
                                        <Badge
                                          variant={
                                            task.priority === "HIGH"
                                              ? "danger"
                                              : task.priority === "MEDIUM"
                                              ? "primary"
                                              : "neutral"
                                          }
                                          className="text-[7px] font-bold uppercase tracking-wider px-1.5 shrink-0"
                                        >
                                          {task.priority}
                                        </Badge>
                                      </div>
                                      {task.description && (
                                        <p className="text-[11px] text-[#5B6272] leading-relaxed font-medium line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center pt-2.5 border-t border-[#E3E5EA] text-[11px]">
                                      <div className="flex items-center gap-2">
                                        {task.assignedTo ? (
                                          <>
                                            <div className="h-6.5 w-6.5 rounded-full bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0">
                                              {task.assignedTo.image ? (
                                                <img src={task.assignedTo.image} alt={task.assignedTo.name || ""} className="h-full w-full object-cover" />
                                              ) : (
                                                task.assignedTo.name ? task.assignedTo.name[0].toUpperCase() : "U"
                                              )}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-bold text-[#5B6272] truncate leading-tight">{task.assignedTo.name || "User"}</p>
                                              <p className="text-[7.5px] font-bold text-[#5B6272] uppercase tracking-widest leading-none mt-0.5">Completed By</p>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="h-6.5 w-6.5 rounded-full border border-dashed border-[#E3E5EA] flex items-center justify-center bg-white shrink-0">
                                              <User className="h-3.5 w-3.5 text-[#2159C9]" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-bold text-[#5B6272] truncate leading-tight">Unassigned Task</p>
                                              <p className="text-[7.5px] font-bold text-[#5B6272] uppercase tracking-widest leading-none mt-0.5">Completed</p>
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      <div className="text-right text-[#5B6272]">
                                        <span className="text-[11px] font-bold uppercase block tracking-wider text-[#5B6272]">Time Logged</span>
                                        <span className="font-bold text-[#5B6272]">
                                          {task.updatedAt 
                                            ? new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        )}
                        </div>
                      )}
                    </div>
                  )}

     
                </div>
              )}

              {/* team TAB */}
              {/* Requirement #5 — meetings for this workspace. Access is enforced
                  server-side by getProjectMeetings; this only renders. */}
              {activeView === "meetings" && (
                <WorkspaceMeetings
                  projectId={projectId}
                  isCompany={role === "COMPANY"}
                  currentUserId={currentUserId}
                  invitees={hiredFreelancers.map((f: any) => ({ id: f.userId ?? f.id, name: f.name }))}
                />
              )}

              {activeView === "team" && teamRoster?.usesRoles && (
                <div className="mb-6">
                  <TeamRosterPanel
                    roles={teamRoster.roles}
                    totalSlots={teamRoster.totalSlots}
                    totalFilled={teamRoster.totalFilled}
                    isTeamComplete={teamRoster.isTeamComplete}
                    viewerRole={role === "COMPANY" ? "COMPANY" : "FREELANCER"}
                    currentFreelancerId={currentUserId}
                    allowHandover
                  />
                </div>
              )}

              {activeView === "team" && (
                <div className="space-y-6">
                  
                  <div>
                    <h2 className="text-base font-bold text-[#1A1D29]">Team Directory</h2>
                    <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">
                      Collaborator profiles, reputation indices, and verified professional skills.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Freelancer Profile card */}
                    {hiredFreelancers.map((freelancer) => (
                      <Card key={freelancer.id} className="border border-[#E3E5EA]/60 p-6 bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#14713D]/10 text-[#147A44] font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-[#BFE9D2]/10">
                          Active Contractor
                        </div>

                        <div className="flex gap-4 items-start">
                          <div
                             onClick={() => {
                               router.push(`/freelancers/${freelancer.freelancerId}`);
                             }}
                             className="h-16 w-16 rounded-full bg-[#EAF1FE] border border-[#E3E5EA] flex items-center justify-center font-bold text-xl text-[#2159C9] overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                           >
                            {freelancer.image ? <img src={freelancer.image} className="h-full w-full object-cover" /> : freelancer.name?.[0].toUpperCase()}
                          </div>
                          
                          <div className="space-y-1.5 min-w-0">
                            <h3
                               onClick={() => {
                                 router.push(`/freelancers/${freelancer.freelancerId}`);
                               }}
                               className="font-bold text-[#1A1D29] text-base truncate cursor-pointer hover:underline hover:text-[#1A1D29]"
                            >
                               {freelancer.name}
                            </h3>
                            <p className="text-[11px] font-bold text-[#1A1D29] uppercase tracking-wide">Freelancer Professional</p>
                            
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex items-center text-[#1A1D29] font-semibold text-xs">
                                <Star className="h-3 w-3 fill-[#F5B942] text-[#8F5E08] mr-1" /> 4.9 <span className="text-[#5B6272] font-medium ml-1">(24 reviews)</span>
                              </div>
                              <span className="text-[#2159C9]">•</span>
                              <div className="text-[11px] text-[#147A44] font-bold uppercase tracking-wider">
                                98% Reputation Score
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-[#E3E5EA] space-y-3.5 text-xs text-[#5B6272] font-medium">
                          <div>
                            <strong className="block text-[#5B6272] font-bold uppercase text-[11px] tracking-wider mb-1.5">Verified Professional Skills:</strong>
                            <div className="flex flex-wrap gap-1.5">
                              {["React", "TypeScript", "NextJS", "Prisma ORM", "TailwindCSS", "PostgreSQL"].map((sk, idx) => (
                                <Badge key={idx} variant="primary" className="text-[11px] font-bold uppercase tracking-wider py-0.5 px-2">
                                  {sk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-[11px] font-medium pt-1.5">
                            <div>
                              <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">Avg Response Time</span>
                              <span className="text-[#1A1D29] font-bold mt-0.5 block">Under 12 Hours</span>
                            </div>
                            <div>
                              <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">On-Time Delivery</span>
                              <span className="text-[#1A1D29] font-bold mt-0.5 block">100% Satisfaction</span>
                            </div>
                          </div>
                        </div>

                      </Card>
                    ))}

                    {/* Client Profile Card */}
                    <Card className="border border-[#E3E5EA]/60 p-6 bg-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#152C55]/10 text-[#1A1D29] font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-[#1A1D29]/10">
                        Employer Owner
                      </div>

                      <div className="flex gap-4 items-start">
                        <div
                          onClick={() => {
                            router.push(`/companies/${companyUser.companyId}`);
                          }}
                          className="h-16 w-16 rounded-full bg-[#152C55] border border-[#E3E5EA] flex items-center justify-center font-bold text-xl text-white overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          {companyUser.image ? <img src={companyUser.image} className="h-full w-full object-cover" /> : "C"}
                        </div>
                        
                        <div className="space-y-1.5 min-w-0">
                          <h3
                            onClick={() => {
                              router.push(`/companies/${companyUser.companyId}`);
                            }}
                            className="font-bold text-[#1A1D29] text-base truncate cursor-pointer hover:underline hover:text-[#1A1D29]"
                          >
                            {companyName}
                          </h3>
                          <p className="text-[11px] font-bold text-[#1A1D29] uppercase tracking-wide">Client Organization</p>
                          
                          <div className="flex items-center text-[#1A1D29] font-semibold text-xs">
                            <Star className="h-3 w-3 fill-[#F5B942] text-[#8F5E08] mr-1" /> 4.8 <span className="text-[#5B6272] font-medium ml-1">(12 reviews)</span>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[#2159C9]">•</span>
                            <div className="text-[11px] text-[#1A1D29] font-bold uppercase tracking-wider">
                              99% Payment Reliability
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#E3E5EA] space-y-3.5 text-xs text-[#5B6272] font-medium">
                        <div className="grid grid-cols-2 gap-4 text-[11px] font-medium">
                          <div>
                            <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">Company Size</span>
                            <span className="text-[#1A1D29] font-bold mt-0.5 block">10-50 Employees</span>
                          </div>
                          <div>
                            <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">Location</span>
                            <span className="text-[#1A1D29] font-bold mt-0.5 block">San Francisco, CA</span>
                          </div>
                          <div>
                            <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">Founded Year</span>
                            <span className="text-[#1A1D29] font-bold mt-0.5 block">2021</span>
                          </div>
                          <div>
                            <span className="text-[#5B6272] block text-[11px] uppercase tracking-wider font-bold">Trust Score</span>
                            <span className="text-[#147A44] font-bold mt-0.5 block">95/100 Verified</span>
                          </div>
                        </div>
                      </div>

                    </Card>

                  </div>

                </div>
              )}

              {/* milestones TAB */}
              {activeView === "milestones" && compensationType !== "MILESTONE" && (
                <WorkspaceFunding
                  projectId={projectId}
                  canManageStages={role === "COMPANY"}
                  canSubmitStages={role === "FREELANCER"}
                  teamOptions={hiredFreelancers.map((f) => ({ applicationId: (f as any).applicationId ?? f.id, name: f.name || "Freelancer" }))}
                  currentUserId={currentUserId}
                  currentApplicationId={applicationId}
                  projectDescription={projectDescription}
                  projectBudget={projectBudget}
                  fundsEscrowed={fundsEscrowed}
                  fundsPaid={fundsPaid}
                />
              )}

              {activeView === "milestones" && compensationType === "MILESTONE" && (
                <div className="mb-8">
                  <WorkspaceFunding
                    projectId={projectId}
                    canManageStages={role === "COMPANY"}
                    canSubmitStages={role === "FREELANCER"}
                    teamOptions={hiredFreelancers.map((f) => ({ applicationId: (f as any).applicationId ?? f.id, name: f.name || "Freelancer" }))}
                    currentUserId={currentUserId}
                    currentApplicationId={applicationId}
                    projectDescription={projectDescription}
                    projectBudget={projectBudget}
                    fundsEscrowed={fundsEscrowed}
                    fundsPaid={fundsPaid}
                  />
                </div>
              )}

              {activeView === "milestones" && compensationType === "MILESTONE" && (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#1A1D29]">Legacy Milestone Records</h2>
                      <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">
                        Historical entries kept for reference. Milestone funding is managed above.
                      </p>
                    </div>
                    {false && role === "COMPANY" && (
                      <Button
                        type="button"
                        onClick={() => setShowAddMilestoneModal(true)}
                        className="bg-[#152C55] hover:bg-[#FFF3DC] text-white font-bold text-xs h-9 px-4 cursor-pointer flex items-center gap-1.5 rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Milestone Phase</span>
                      </Button>
                    )}
                  </div>

                  {/* Milestone money lives in the funding ledger above, which is the
                      single source of truth. The legacy escrow tiles are removed so the
                      same balance is never shown twice with different numbers. */}
                  <div className="rounded-lg border border-[#C7CBD6] bg-[#F8F9FB] px-4 py-3 text-[11px] font-semibold text-[#5B6272]">
                    Funding, release and per-freelancer balances for these milestones are shown in
                    <span className="text-[#1A1D29]"> Milestone Funding </span>
                    above. The list below keeps the milestone details and workflow.
                  </div>

                  {/* Milestones list card */}
                  <div className="space-y-4">
                    {updates.length === 0 ? (
                      <Card className="p-12 text-center bg-white border border-[#E3E5EA]/60 rounded-lg space-y-3">
                        <div className="h-12 w-12 rounded-lg bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center mx-auto text-[#5B6272]">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-[#5B6272]">No milestone phases created.</p>
                        <p className="text-xs text-[#5B6272]">
                          {role === "COMPANY" 
                            ? "Create milestone phases to distribute payments across deliverables."
                            : "Awaiting client to create project milestones."}
                        </p>
                      </Card>
                    ) : (
                      [...updates].reverse().map((milestone, idx) => {
                        const { cleanTitle } = parseMilestoneAmount(milestone.title, milestone.description || "");
                        return (
                          <Card 
                            key={milestone.id} 
                            className={`border rounded-lg p-5 bg-white relative overflow-hidden transition-all ${
                              milestone.status === "COMPLETED" ? "border-[#BFE9D2]/60 shadow-[#14713D]/5 bg-[#E4F7EC]/5" :
                              milestone.status === "IN_PROGRESS" ? "border-[#C7CBD6]/60 shadow-[#2E6BEA]/5 bg-[#E8F1FE]/5 animate-pulse-slow" : "border-[#E3E5EA]/60"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-widest bg-[#E8F1FE] px-2 py-0.5 rounded-full">
                                    Phase #{updates.length - idx}
                                  </span>
                                  <h4 className="font-bold text-[#1A1D29] text-sm">{cleanTitle}</h4>
                                  <Badge 
                                    variant={
                                      milestone.status === "COMPLETED" ? "success" :
                                      milestone.status === "IN_PROGRESS" ? "primary" : "neutral"
                                    }
                                  >
                                    {milestone.status === "COMPLETED" ? "Done" :
                                     milestone.status === "IN_PROGRESS" ? "In progress" : "Not started"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-[#5B6272] leading-relaxed max-w-2xl">
                                  {milestone.description || "No deliverable description specified."}
                                </p>
                              </div>
                              {/* WS-003 — a ProjectUpdate carries no money; the
                                  Funding tab is the source of truth for value. */}
                            </div>

                            {/* Actions block */}
                            <div className="mt-4 pt-3.5 border-t border-[#E3E5EA]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-[#5B6272] uppercase">
                                <Clock className="h-3.5 w-3.5 text-[#5B6272] shrink-0" />
                                <span>Created on {new Date(milestone.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {milestone.status === "PENDING" && (
                                  role === "COMPANY" ? (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(milestone.id, "IN_PROGRESS")}
                                      size="sm"
                                      className="bg-[#2E6BEA] hover:bg-[#2E6BEA] text-white font-bold text-xs px-4 h-8 cursor-pointer rounded-full border-none"
                                    >
                                      Fund & Start Phase
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] font-bold text-[#5B6272] bg-[#F8F9FB] border border-[#E3E5EA]/50 py-1 px-3 rounded-full uppercase tracking-wider">
                                      Awaiting client funding to activate
                                    </span>
                                  )
                                )}

                                {milestone.status === "IN_PROGRESS" && (
                                  role === "COMPANY" ? (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(milestone.id, "COMPLETED")}
                                      size="sm"
                                      className="bg-[#14713D] hover:bg-[#14713D] text-white font-bold text-xs px-4 h-8 cursor-pointer rounded-full border-none"
                                    >
                                      Approve & Release Payment
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] font-bold text-[#2159C9] bg-[#E8F1FE] border border-[#C7CBD6] py-1 px-3 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#2E6BEA] animate-pulse" />
                                      Funds secured in escrow (active phase)
                                    </span>
                                  )
                                )}

                                {milestone.status === "COMPLETED" && (
                                  <span className="text-[11px] font-bold text-[#147A44] bg-[#E4F7EC] border border-[#BFE9D2] py-1 px-3 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#147A44] shrink-0" />
                                    Funds released to freelancer wallet
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

      {/* MODAL: CREATE KANBAN TASK */}
      {showAddTaskModal && (
        <Modal open onClose={() => setShowAddTaskModal(false)} size="lg" title="Create Kanban Task">
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Task Title</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Implement user dashboard checkout button"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-white border-[#E3E5EA] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Provide checklist details or specific task guidelines..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-xs text-[#1A1D29] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-md border border-[#E3E5EA] bg-white focus:outline-none text-xs text-[#1A1D29]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Due Date</label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="bg-white border-[#E3E5EA] text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Assignee</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md border border-[#E3E5EA] bg-white focus:outline-none text-xs text-[#1A1D29]"
                >
                  <option value="">Unassigned</option>
                  <option value={companyUser.id}>{companyUser.name} (Client Manager)</option>
                  {hiredFreelancers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} (Freelancer)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setShowAddTaskModal(false)} variant="outline" className="text-xs font-bold px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingTask || !newTaskTitle.trim()} className="bg-[#152C55] text-white hover:bg-[#EAF1FE] text-xs font-bold px-4 cursor-pointer">
                  {isSubmittingTask ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Modal>
      )}

      {/* MODAL: EDIT/DETAIL KANBAN TASK */}
      {showTaskDetailModal && selectedTask && (
        <Modal open onClose={() => { setShowTaskDetailModal(false); setSelectedTask(null); }} size="lg" title="Task Details">
            <form onSubmit={handleUpdateTaskDetails} className="space-y-4 text-xs">

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Task Title</label>
                <Input
                  type="text"
                  required
                  value={selectedTask.title}
                  onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  className="bg-white border-[#E3E5EA] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Description</label>
                <textarea
                  value={selectedTask.description || ""}
                  onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#C7CBD6] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-xs text-[#1A1D29] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-md border border-[#E3E5EA] bg-white focus:outline-none text-xs text-[#1A1D29]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Due Date</label>
                  <Input
                    type="date"
                    value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value ? new Date(e.target.value) : null })}
                    className="bg-white border-[#E3E5EA] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Assignee</label>
                  <select
                    value={selectedTask.assignedToId || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, assignedToId: e.target.value || null })}
                    className="w-full px-3.5 py-2 rounded-md border border-[#E3E5EA] bg-white focus:outline-none text-xs text-[#1A1D29]"
                  >
                    <option value="">Unassigned</option>
                    <option value={companyUser.id}>{companyUser.name} (Client Manager)</option>
                    {hiredFreelancers.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} (Freelancer)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Status Board</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-md border border-[#C7CBD6] bg-white focus:outline-none text-xs text-[#1A1D29]"
                  >
                    {TASK_COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  variant="outline"
                  className="text-xs font-bold border-[#F5C2C2] text-[#BC2A2A] hover:bg-[#FDEAEA] cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button onClick={() => { setShowTaskDetailModal(false); setSelectedTask(null); }} variant="outline" className="text-xs font-bold px-4 cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdatingTask || !selectedTask.title.trim()} className="bg-[#152C55] text-white hover:bg-[#F0F3F9] text-xs font-bold px-4 cursor-pointer">
                    {isUpdatingTask ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
      )}

      {/* MODAL: ADD MILESTONE PHASE */}
      {showAddMilestoneModal && (
        <Modal open onClose={() => setShowAddMilestoneModal(false)} size="lg" title="Create Milestone Phase">
            <form onSubmit={handleCreateMilestone} className="space-y-4 text-xs">

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Milestone Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Core landing page layout designs"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="bg-white border-[#E3E5EA] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider">Deliverable Criteria Description</label>
                <textarea
                  placeholder="Explain exactly what criteria the freelancer needs to satisfy to release this payment amount..."
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20 focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] text-xs text-[#1A1D29] bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setShowAddMilestoneModal(false)} variant="outline" className="text-xs font-bold px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingMilestone || !newMilestoneTitle.trim()} className="bg-[#152C55] text-white hover:bg-[#FFF3DC] text-xs font-bold px-4 cursor-pointer">
                  {isSubmittingMilestone ? "Creating..." : "Fund Milestone Phase"}
                </Button>
              </div>
            </form>
          </Modal>
      )}

    </div>
  );
}
