"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { fileToBase64 } from "@/lib/utils";
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
  Play,
  Pause,
  Mic,
  Bot,
  Printer,
  Search,
  Eye,
  Sparkles,
} from "lucide-react";
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
} from "@/actions/collaborationActions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MessageItem {
  id: string;
  content: string;
  createdAt: Date | string;
  senderId: string;
  channel: string;
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
  role: "COMPANY" | "FREELANCER";
  currentUserId: string;
  projectId: string;
  projectTitle: string;
  projectBudget: number;
  companyName: string;
  hiredFreelancers: {
    id: string;
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
}

interface DeliverableMeta {
  size: string;
  status: "PENDING" | "APPROVED" | "REVISION_REQUESTED";
  feedback?: string;
  version: number;
}

// Helpers for serializing file properties & milestones
function parseDeliverableMeta(fileSizeStr: string | null): DeliverableMeta {
  if (!fileSizeStr) return { size: "Unknown size", status: "PENDING", version: 1 };
  try {
    const parsed = JSON.parse(fileSizeStr);
    if (parsed && typeof parsed === "object" && "status" in parsed) {
      return {
        size: parsed.size || "Unknown size",
        status: parsed.status || "PENDING",
        feedback: parsed.feedback || "",
        version: parsed.version || 1,
      };
    }
  } catch (e) {}
  return { size: fileSizeStr, status: "PENDING", version: 1 };
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

function VoiceMessagePlayer({ content, isMe }: { content: string; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const audioContextRef = useRef<any>(null);
  const playTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Parse duration
  let voiceDur = "0:00";
  const durMatch = content.match(/duration:([^\]]+)/);
  if (durMatch) voiceDur = durMatch[1];

  const [minStr, secStr] = voiceDur.split(":");
  const totalSeconds = (parseInt(minStr) || 0) * 60 + (parseInt(secStr) || 0) || 5; // fallback to 5s if parsing fails

  // Deterministic bar heights to avoid layout shifts / constant random jittering
  const barHeights = [12, 6, 14, 8, 16, 10, 15, 7, 18, 9, 14, 6, 13, 8, 15, 7, 12, 10];

  const stopAudio = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      if (startTimeRef.current > 0) {
        pausedAtRef.current = (Date.now() - startTimeRef.current) / 1000;
      }
      stopAudio();
    } else {
      // Play
      setIsPlaying(true);
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        // Fallback animation if Web Audio API not supported
        startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);
        playTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed >= totalSeconds) {
            setProgress(0);
            pausedAtRef.current = 0;
            stopAudio();
          } else {
            setProgress(elapsed / totalSeconds);
          }
        }, 100);
        return;
      }

      try {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Warm triangle wave has higher-order harmonics, which are easily hearable on laptop/phone speakers
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, ctx.currentTime);

        // Bandpass filter centered at 700Hz with high resonance simulates a speech formant (vowels)
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(700, ctx.currentTime);
        filter.Q.setValueAtTime(1.8, ctx.currentTime);

        // Sound start
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.08);

        // Speech simulation notes
        const durationSec = totalSeconds - pausedAtRef.current;
        let time = ctx.currentTime + 0.15;
        const step = 0.12;
        while (time < ctx.currentTime + durationSec - 0.15) {
          // Vary the pitch slightly inside vocal range (300Hz - 420Hz)
          const freq = 300 + Math.random() * 120;
          osc.frequency.setValueAtTime(freq, time);

          // Sweep the bandpass filter frequency to simulate vocal formant changes
          const filterFreq = 500 + Math.random() * 700;
          filter.frequency.setValueAtTime(filterFreq, time);

          // Modulate volume to simulate speech rhythms & word breaks
          const vol = Math.random() > 0.4 ? 0.3 : 0.015;
          gain.gain.linearRampToValueAtTime(vol, time);
          time += step;
        }

        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime + durationSec - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

        osc.start();
        osc.stop(ctx.currentTime + durationSec);

        startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);

        playTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed >= totalSeconds) {
            setProgress(0);
            pausedAtRef.current = 0;
            stopAudio();
          } else {
            setProgress(elapsed / totalSeconds);
          }
        }, 100);

      } catch (err) {
        console.error("Audio playback error:", err);
        // Fail-safe visual animation
        startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);
        playTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed >= totalSeconds) {
            setProgress(0);
            pausedAtRef.current = 0;
            stopAudio();
          } else {
            setProgress(elapsed / totalSeconds);
          }
        }, 100);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, []);

  // Compute how many bars are highlighted based on progress
  const activeBarsCount = Math.floor(progress * barHeights.length);

  // Dynamic styling based on sender/receiver (isMe)
  const buttonBgClass = isMe
    ? "bg-white/20 hover:bg-white/30 text-white"
    : "bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300/40";
  const iconClass = isMe ? "text-white fill-white" : "text-slate-700 fill-slate-700";
  const textClass = isMe ? "text-white/85" : "text-slate-600";

  return (
    <div className="flex items-center gap-3.5 min-w-[200px]">
      <button
        type="button"
        onClick={handlePlayPause}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer border-none transition-colors ${buttonBgClass}`}
      >
        {isPlaying ? (
          <Pause className={`h-4 w-4 ${isMe ? "fill-white text-white" : "fill-slate-700 text-slate-700"}`} />
        ) : (
          <Play className={`h-4 w-4 ${iconClass}`} />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-0.5 h-6">
          {barHeights.map((h, i) => {
            const isPlayed = i <= activeBarsCount && progress > 0;
            const barBgClass = isMe
              ? isPlayed ? "bg-white" : "bg-white/30"
              : isPlayed ? "bg-[#002d59]" : "bg-slate-300";
            return (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${barBgClass}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className={`flex justify-between text-[8px] font-black uppercase tracking-wider ${textClass}`}>
          <span>Voice Message</span>
          <span>
            {isPlaying
              ? `${Math.floor((progress * totalSeconds) / 60)}:${(Math.floor(progress * totalSeconds) % 60) < 10 ? "0" : ""}${Math.floor(progress * totalSeconds) % 60}`
              : voiceDur}
          </span>
        </div>
      </div>
    </div>
  );
}


export function WorkspaceView({
  role,
  currentUserId,
  projectId,
  projectTitle,
  projectBudget,
  companyName,
  hiredFreelancers,
  companyUser,
  initialMessages,
  initialFiles,
  initialUpdates,
  initialTasks,
}: WorkspaceViewProps) {
  const router = useRouter();

  // Navigation Menu: "overview" | "messages" | "deliverables" | "tasks" | "team"
  const [activeView, setActiveView] = useState<"overview" | "messages" | "deliverables" | "tasks" | "team">("overview");

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
  const [taskViewMode, setTaskViewMode] = useState<"board" | "timeline">("board");

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
          const hasNew = curr.length !== data.messages.length || 
            (curr.length > 0 && data.messages.length > 0 && curr[curr.length - 1].id !== data.messages[data.messages.length - 1].id);
          return hasNew ? data.messages : curr;
        });

        setTasks((curr) => {
          const serialize = (list: TaskItem[]) => list.map(t => `${t.id}-${t.status}-${t.priority}-${t.assignedToId}`).join("|");
          return serialize(data.tasks) !== serialize(curr) ? data.tasks : curr;
        });

        setFiles((curr) => (curr.length !== data.files.length ? data.files : curr));
        setUpdates((curr) => (curr.length !== data.updates.length ? data.updates : curr));
      } catch (err) {
        console.error("Workspace sync error:", err);
      }
    };

    const interval = setInterval(fetchWorkspaceUpdates, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId]);

  // UI state variables
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording simulation
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceWave, setVoiceWave] = useState<number[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // AI Chat Assistant
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiConversation, setAiConversation] = useState<{ sender: "user" | "ai"; text: string; time: Date }[]>([
    { sender: "ai", text: "Hello! I am your Talentra AI Workspace Assistant. Ask me anything about your project milestones, deadlines, budget, or tasks.", time: new Date() }
  ]);
  const [isAITyping, setIsAITyping] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

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
  const [showQuickActions, setShowQuickActions] = useState(false);
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
  const [newMilestoneValue, setNewMilestoneValue] = useState("");
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

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiConversation, showAIAssistant]);

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
      alert(result.error);
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
        alert(result.error);
        setFiles((prev) => prev.filter(f => f.id !== tempId));
      }
    } catch (err: any) {
      alert("Failed to share file deliverable.");
      setFiles((prev) => prev.filter(f => f.id !== tempId));
    } finally {
      setIsUploadingFile(false);
      setDeliverableVersionTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // HANDLER: Delete File
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;
    setFiles((prev) => prev.filter(f => f.id !== fileId));
    const result = await deleteFile(projectId, fileId);
    if (result.error) {
      alert(result.error);
    }
  };

  // HANDLER: Deliverable review actions
  const handleReviewDeliverable = async (fileId: string, status: "APPROVED" | "REVISION_REQUESTED") => {
    if (!reviewFeedback.trim()) {
      alert("Please provide revision feedback or approval comments first.");
      return;
    }
    setIsReviewing(true);

    const result = await updateDeliverableStatus(projectId, fileId, status, reviewFeedback);
    setIsReviewing(false);

    if (result.error) {
      alert(result.error);
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
    if (!newMilestoneTitle.trim() || !newMilestoneValue.trim() || isSubmittingMilestone) return;

    setIsSubmittingMilestone(true);
    const amountVal = parseFloat(newMilestoneValue.replace(/[^0-9.]/g, "")) || 0;
    const formattedTitle = `[Value: $${amountVal.toLocaleString()}] ${newMilestoneTitle.trim()}`;

    const result = await createProjectUpdate(projectId, formattedTitle, newMilestoneDesc, "PENDING");
    setIsSubmittingMilestone(false);
    setNewMilestoneTitle("");
    setNewMilestoneDesc("");
    setNewMilestoneValue("");
    setShowAddMilestoneModal(false);

    if (result.error) {
      alert(result.error);
    }
  };

  const handleUpdateMilestoneStatus = async (updateId: string, newStatus: string) => {
    const result = await updateProjectUpdateStatus(projectId, updateId, newStatus);
    if (result.error) {
      alert(result.error);
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
      alert(result.error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    const result = await updateTaskStatus(projectId, taskId, newStatus);
    if (result.error) {
      alert(result.error);
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
      alert(result.error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setTasks((prev) => prev.filter(t => t.id !== taskId));
    setShowTaskDetailModal(false);
    setSelectedTask(null);
    const result = await deleteTask(projectId, taskId);
    if (result.error) {
      alert(result.error);
    }
  };

  // SIMULATION: Voice recording
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    setVoiceWave([2, 5, 2, 8, 2, 4, 3]);
    recordingTimer.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
      // random wave height simulation
      setVoiceWave(Array.from({ length: 15 }, () => Math.floor(Math.random() * 28) + 4));
    }, 1000);
  };

  const stopAndSendVoice = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    setIsRecordingVoice(false);

    const minutes = Math.floor(recordingSeconds / 60);
    const seconds = recordingSeconds % 60;
    const durStr = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    const simulatedVoiceMsg = `[VOICE:voice_rec_${Date.now()}.mp3|duration:${durStr}]`;

    await handleSendMessage(null as any, simulatedVoiceMsg);
  };

  const cancelVoiceRecording = () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    setIsRecordingVoice(false);
  };

  // SIMULATION: AI Chatbot responses
  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput;
    setAiInput("");
    setAiConversation((prev) => [...prev, { sender: "user", text: userText, time: new Date() }]);
    setIsAITyping(true);

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let reply = "";

      if (lower.includes("task") || lower.includes("to do") || lower.includes("kanban")) {
        const todoCount = tasks.filter(t => t.status === "TODO").length;
        const progressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;
        const doneCount = tasks.filter(t => t.status === "DONE").length;
        reply = `There are currently **${tasks.length} tasks** in the Kanban Board: \n• **${todoCount}** in To Do\n• **${progressCount}** In Progress\n• **${doneCount}** Done.\nLet me know if you would like me to list them by priority!`;
      } else if (lower.includes("budget") || lower.includes("escrow") || lower.includes("money") || lower.includes("pay")) {
        // Calculate milestones values
        let released = 0;
        let held = 0;
        let pending = 0;
        updates.forEach(u => {
          const { amount } = parseMilestoneAmount(u.title, u.description);
          if (u.status === "COMPLETED") released += amount;
          else if (u.status === "IN_PROGRESS") held += amount;
          else pending += amount;
        });

        reply = `Here is the current financial standing for **${projectTitle}**:\n• **Total budget:** $${projectBudget.toLocaleString()}\n• **Escrow Wallet secured:** $${held.toLocaleString()} (funded milestones in progress)\n• **Released to Freelancer:** $${released.toLocaleString()}\n• **Remaining unfunded milestones:** $${pending.toLocaleString()}.`;
      } else if (lower.includes("deadline") || lower.includes("date") || lower.includes("timeline")) {
        reply = `The final project timeline deadline is scheduled for **December 28, 2026**. Please coordinate tasks and milestones accordingly to prevent delivery lags.`;
      } else if (lower.includes("deliverable") || lower.includes("file") || lower.includes("submission")) {
        const approved = files.filter(f => parseDeliverableMeta(f.fileSize).status === "APPROVED").length;
        const pending = files.filter(f => parseDeliverableMeta(f.fileSize).status === "PENDING").length;
        reply = `In the Deliverables archive, there are **${files.length} submissions** in total:\n• **${approved}** Approved deliverables\n• **${pending}** Pending client review.\nYou can view, approve, or request revisions directly in the Deliverables tab.`;
      } else if (lower.includes("draft") || lower.includes("write")) {
        reply = `Here is a drafted message for your collaborator:\n\n*"Hi, just checking in on the progress of the milestone deliverables. Let me know if you need any resources or have questions. Thanks!"*\n\nCopy and paste this into the Messages tab to send!`;
      } else {
        reply = `I can help you audit this project. Ask me about tasks ("list tasks"), budget escrow status ("show wallet balance"), or file submissions ("check deliverables").`;
      }

      setAiConversation((prev) => [...prev, { sender: "ai", text: reply, time: new Date() }]);
      setIsAITyping(false);
    }, 850);
  };

  // CRITICAL: Filter tasks
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

  const groupedTimeline: { [key: string]: TaskItem[] } = {};
  completedTasks.forEach(task => {
    const dateStr = task.updatedAt 
      ? new Date(task.updatedAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(task.createdAt).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!groupedTimeline[dateStr]) {
      groupedTimeline[dateStr] = [];
    }
    groupedTimeline[dateStr].push(task);
  });

  // Sort completion dates descending (newest first)
  const sortedDates = Object.keys(groupedTimeline).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // MILESTONE COMPLETION CALCULATION
  const completedMilestones = updates.filter((u) => u.status === "COMPLETED").length;
  const milestonePercentage = updates.length > 0 ? Math.round((completedMilestones / updates.length) * 100) : 0;

  // ESCROW CALCULATIONS
  let fundsEscrowed = 0;
  let fundsPaid = 0;
  updates.forEach((u) => {
    const { amount } = parseMilestoneAmount(u.title, u.description);
    if (u.status === "COMPLETED") {
      fundsPaid += amount;
    } else if (u.status === "IN_PROGRESS") {
      fundsEscrowed += amount;
    }
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f4f8ff] text-slate-850 font-sans overflow-hidden">
      
      {/* SaaS Workspace Top Control Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm relative z-30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#3ac0ff] to-[#002d59] flex items-center justify-center font-black text-white shadow-md shadow-[#3ac0ff]/20">
              {projectTitle[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-black text-[#002d59] tracking-tight leading-none">{projectTitle}</h1>
                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Standalone Workspace</p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200" />

          {/* Collaborator Avatars list */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider hidden xs:inline">Team:</span>
            <div className="flex -space-x-1.5 overflow-hidden">
              <div
                onClick={() => {
                  router.push(`/companies/${companyUser.companyId}`);
                }}
                className="h-6 w-6 rounded-full bg-[#002d59] border border-white flex items-center justify-center text-[8px] font-bold text-white shrink-0 shadow-sm cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                title={`${companyName} (Client)`}
              >
                {companyUser.image ? (
                  <img src={companyUser.image} alt={companyName} className="h-full w-full object-cover" />
                ) : (
                  "C"
                )}
              </div>
              {hiredFreelancers.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    router.push(`/freelancers/${f.freelancerId}`);
                  }}
                  className="h-6 w-6 rounded-full bg-sky-500 border border-white flex items-center justify-center text-[8px] font-extrabold text-white shrink-0 overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  title={`${f.name} (Freelancer)`}
                >
                  {f.image ? (
                    <img src={f.image} alt={f.name || ""} className="h-full w-full object-cover" />
                  ) : (
                    f.name ? f.name[0].toUpperCase() : "F"
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: current user avatar + metadata + quick actions */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Current logged-in user avatar */}
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
                className="h-8 w-8 rounded-full border-2 border-[#3ac0ff] overflow-hidden bg-[#002d59] flex items-center justify-center text-xs font-black text-white shadow-md shrink-0"
                title={`${currentName} (You)`}
              >
                {currentImg ? (
                  <img src={currentImg} alt={currentName} className="h-full w-full object-cover" />
                ) : (
                  currentName[0]?.toUpperCase() ?? "U"
                )}
              </div>
            );
          })()}

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 px-4 py-1.5 rounded-xl">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Budget</span>
              <span className="font-extrabold text-[#002d59] text-[11px] mt-0.5 block leading-none">${projectBudget.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Deadline</span>
              <span className="font-extrabold text-amber-600 text-[11px] mt-0.5 block leading-none">Dec 28, 2026</span>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="bg-[#002d59] hover:bg-[#001f3f] border border-slate-200 text-white font-bold text-xs h-8 px-3.5 flex items-center gap-1 cursor-pointer rounded-xl"
            >
              <span>Quick Actions</span>
              <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${showQuickActions ? "rotate-270" : "rotate-90"}`} />
            </Button>
            
            {showQuickActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => { setShowQuickActions(false); setShowAddTaskModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-600 hover:text-[#002d59] hover:bg-slate-50 font-bold transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-sky-550" />
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowQuickActions(false); fileInputRef.current?.click(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-600 hover:text-[#002d59] hover:bg-slate-50 font-bold transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
                    Share Deliverable
                  </button>
                  {role === "COMPANY" && (
                    <button
                      type="button"
                      onClick={() => { setShowQuickActions(false); setShowAddMilestoneModal(true); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-600 hover:text-[#002d59] hover:bg-slate-50 font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-slate-100 bg-transparent border-none"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-650" />
                      Add Milestone Phase
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Top Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 z-20">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "tasks", label: "Tasks", icon: CheckSquare },
          { id: "deliverables", label: "Deliverables", icon: Archive },
          { id: "messages", label: "Chat", icon: MessageSquare },
          { id: "team", label: "Team", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          let tabBadge: React.ReactNode = null;
          if (item.id === "messages" && messages.length > 0) {
            tabBadge = (
              <span className="bg-sky-50 text-[#002d59] text-[8px] font-black px-1.5 py-0.5 rounded-full border border-sky-200/50">
                {messages.length}
              </span>
            );
          } else if (item.id === "tasks") {
            const pendingTasks = tasks.filter(t => t.status !== "DONE").length;
            if (pendingTasks > 0) {
              tabBadge = (
                <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200/50">
                  {pendingTasks}
                </span>
              );
            }
          } else if (item.id === "deliverables" && files.length > 0) {
            tabBadge = (
              <span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                {files.length}
              </span>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setActiveView(item.id as any); setShowMobileChatSidebar(true); }}
              className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? "border-[#002d59] text-[#002d59]"
                  : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#002d59]" : "text-slate-400"}`} />
              <span>{item.label}</span>
              {tabBadge}
            </button>
          );
        })}
      </nav>

      {/* Main Content Viewport */}
      <main className={`flex-1 bg-[#f4f8ff] ${
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
              {activeView === "overview" && (
                <div className="space-y-6">
                  
                  {/* Banner header card with glassmorphism */}
                  <div className="bg-gradient-to-r from-[#002d59] to-[#004f8c] border border-slate-100 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 h-40 w-40 rounded-full bg-[#3ac0ff]/15 blur-3xl" />
                    <div className="relative space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="accent" className="text-[9px] font-black uppercase tracking-wider mb-2">
                            Freelance Project Portal
                          </Badge>
                          <h1 className="text-2xl font-black tracking-tight">{projectTitle}</h1>
                          <p className="text-slate-200 text-xs mt-1.5 max-w-xl leading-relaxed">
                            Welcome to your workspace. Sync on tasks, track milestone disbursements, upload final deliverables, and ask our AI assistant for reports.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Milestones completed</p>
                          <p className="text-3xl font-black text-[#3ac0ff] mt-0.5">{milestonePercentage}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20 text-xs">
                        <div>
                          <span className="text-slate-200 block text-[9px] font-bold uppercase tracking-wider">Total Contract Value</span>
                          <span className="font-extrabold text-[#3ac0ff] text-sm mt-0.5 block">${projectBudget.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-200 block text-[9px] font-bold uppercase tracking-wider">Funds Paid to Date</span>
                          <span className="font-extrabold text-emerald-300 text-sm mt-0.5 block">${fundsPaid.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-200 block text-[9px] font-bold uppercase tracking-wider">Secured in Escrow</span>
                          <span className="font-extrabold text-sky-300 text-sm mt-0.5 block">${fundsEscrowed.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-200 block text-[9px] font-bold uppercase tracking-wider">Contract Deadline</span>
                          <span className="font-extrabold text-amber-300 text-sm mt-0.5 block">Dec 28, 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overview panels grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left & Middle: Recent Activity Feed & Upcoming Milestone */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Upcoming Milestone Spotlight */}
                      <Card className="border border-slate-200/60 p-5 shadow-xs relative overflow-hidden bg-white">
                        <div className="absolute top-0 right-0 bg-[#3ac0ff]/10 text-[#002d59] font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-[#3ac0ff]/20">
                          Milestone Phase
                        </div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Upcoming Milestone</h3>
                        
                        {updates.filter(u => u.status !== "COMPLETED").length === 0 ? (
                          <div className="py-6 flex items-center gap-3 text-slate-400 text-xs font-bold">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            All milestones successfully delivered and completed!
                          </div>
                        ) : (
                          (() => {
                            const nextMilestone = updates.filter(u => u.status !== "COMPLETED").reverse()[0];
                            const { amount, cleanTitle } = parseMilestoneAmount(nextMilestone.title, nextMilestone.description);
                            return (
                              <div className="mt-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-slate-800 text-sm">{cleanTitle}</h4>
                                  <Badge variant={nextMilestone.status === "IN_PROGRESS" ? "primary" : "neutral"}>
                                    {nextMilestone.status.replace("_", " ").toLowerCase()}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                                  {nextMilestone.description || "No description provided."}
                                </p>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                                  <span className="font-bold text-slate-700">Milestone Value: <span className="text-[#002d59]">${amount.toLocaleString()}</span></span>
                                  {role === "COMPANY" && nextMilestone.status === "PENDING" && (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(nextMilestone.id, "IN_PROGRESS")}
                                      size="sm"
                                      variant="secondary"
                                      className="text-xs py-1 h-7 font-bold cursor-pointer"
                                    >
                                      Fund and Start Milestone
                                    </Button>
                                  )}
                                  {role === "COMPANY" && nextMilestone.status === "IN_PROGRESS" && (
                                    <Button
                                      onClick={() => handleUpdateMilestoneStatus(nextMilestone.id, "COMPLETED")}
                                      size="sm"
                                      variant="primary"
                                      className="text-xs py-1 h-7 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
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
                      <Card className="border border-slate-200/60 p-5 shadow-xs bg-white">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Recent Workspace Activity</h3>
                          <span className="text-[10px] text-slate-400 font-bold">Auto Synced</span>
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
                                <p className="text-xs text-slate-400 py-6 text-center">No activity logged in this workspace yet.</p>
                              );
                            }
 
                            return logs.slice(0, 6).map((log, idx) => (
                              <div key={`${log.id}-${idx}`} className="flex gap-3 text-xs leading-relaxed items-start">
                                <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center ${
                                  log.type === "milestone" ? "bg-purple-50 text-purple-600" : 
                                  log.type === "task" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"
                                }`}>
                                  {log.type === "milestone" && <Sparkles className="h-3 w-3" />}
                                  {log.type === "task" && <CheckSquare className="h-3 w-3" />}
                                  {log.type === "file" && <Archive className="h-3 w-3" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-slate-800 leading-tight">{log.title}</p>
                                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">{log.desc}</p>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
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
                      <Card className="border border-slate-200/60 p-6 shadow-xs flex flex-col items-center justify-center text-center bg-white">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Contract Status</h3>
                        
                        {/* Circular progress container */}
                        <div className="relative h-28 w-28 flex items-center justify-center">
                          <svg className="absolute h-full w-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                            <circle cx="56" cy="56" r="48" stroke="url(#blueGrad)" strokeWidth="8" fill="transparent"
                              strokeDasharray={301.6}
                              strokeDashoffset={301.6 - (301.6 * milestonePercentage) / 100}
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3ac0ff" />
                                <stop offset="100%" stopColor="#002d59" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="text-center">
                            <p className="text-2xl font-black text-slate-800 leading-none">{milestonePercentage}%</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Paid</p>
                          </div>
                        </div>

                        <p className="text-xs font-extrabold text-slate-700 mt-6 leading-tight">
                          {completedMilestones} of {updates.length} Milestone Phases Done
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Funds are released automatically upon final client milestone approval.
                        </p>
                      </Card>

                      {/* Workspace team profiles short preview */}
                      <Card className="border border-slate-200/60 p-5 shadow-xs bg-white space-y-3">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Collaborators</h3>
                        
                        <div className="space-y-3 pt-1 text-xs">
                                                    <div className="flex items-center gap-2">
                            <div
                              onClick={() => {
                                router.push(`/companies/${companyUser.companyId}`);
                              }}
                              className="h-7 w-7 rounded-full bg-[#002d59] flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
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
                                className="font-extrabold text-slate-800 truncate cursor-pointer hover:underline hover:text-[#3ac0ff]"
                              >
                                {companyName}
                              </p>
                              <p className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">Client</p>
                            </div>
                          </div>
                          {/* Freelancers */}
                          {hiredFreelancers.map(f => (
                            <div key={f.id} className="flex items-center gap-2">
                              <div
                                onClick={() => {
                                  router.push(`/freelancers/${f.freelancerId}`);
                                }}
                                className="h-7 w-7 rounded-full bg-sky-500/20 text-[#002d59] font-extrabold flex items-center justify-center text-[10px] overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
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
                                  className="font-extrabold text-slate-800 truncate cursor-pointer hover:underline hover:text-[#3ac0ff]"
                                >
                                  {f.name}
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">Freelancer</p>
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
                    {/* Left: WhatsApp-style Sub-sidebar for channels and DMs */}
                  <div className={`w-full lg:w-[280px] shrink-0 bg-white border border-slate-200 rounded-3xl p-4 space-y-5 flex flex-col justify-start overflow-y-auto shadow-sm ${showMobileChatSidebar ? "flex" : "hidden lg:flex"}`}>
                    {/* Channels section */}
                    <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <h4 className="text-[9px] font-black text-[#002d59] uppercase tracking-widest pl-1 mb-2">Channels</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChannel("group");
                          setShowMobileChatSidebar(false);
                        }}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border ${
                          activeChannel === "group"
                            ? "bg-[#3ac0ff]/15 border-[#3ac0ff]/30 text-[#002d59] shadow-xs"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-[#002d59] flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs truncate">Group Chat</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Public Channel</p>
                        </div>
                      </button>
 
                      {role === "FREELANCER" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChannel("freelancers");
                            setShowMobileChatSidebar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer mt-1 border ${
                            activeChannel === "freelancers"
                              ? "bg-[#3ac0ff]/15 border-[#3ac0ff]/30 text-[#002d59] shadow-xs"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
                          }`}
                          title="Only hired freelancers can view this private channel"
                        >
                          <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs truncate">Freelancers Private</p>
                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">🔒 Private Channel</p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Direct Messages section */}
                    <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex-1 overflow-y-auto">
                      <h4 className="text-[9px] font-black text-[#002d59] uppercase tracking-widest pl-1 mb-2">Direct Messages</h4>
                      
                      {role === "FREELANCER" && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChannel(getDMChannelKey(companyUser.id));
                            setShowMobileChatSidebar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer border ${
                            activeChannel === getDMChannelKey(companyUser.id)
                              ? "bg-[#3ac0ff]/15 border-[#3ac0ff]/30 text-[#002d59] shadow-xs"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden shadow-xs relative">
                            {companyUser.image ? (
                              <img src={companyUser.image} className="h-full w-full object-cover" />
                            ) : (
                              <span>{companyName[0].toUpperCase()}</span>
                            )}
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-xs truncate">{companyName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Client Representative</p>
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
                                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer mt-1 border ${
                                  activeChannel === getDMChannelKey(f.id)
                                    ? "bg-[#3ac0ff]/15 border-[#3ac0ff]/30 text-[#002d59] shadow-xs"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
                                }`}
                              >
                                <div className="h-8 w-8 rounded-full bg-[#002d59] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-xs relative">
                                  {f.image ? (
                                    <img src={f.image} className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{f.name ? f.name[0].toUpperCase() : "U"}</span>
                                  )}
                                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-xs truncate">{f.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{f.role.toLowerCase()}</p>
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
                              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer mt-1 border ${
                                activeChannel === getDMChannelKey(f.id)
                                  ? "bg-[#3ac0ff]/15 border-[#3ac0ff]/30 text-[#002d59] shadow-xs"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
                              }`}
                            >
                              <div className="h-8 w-8 rounded-full bg-[#002d59] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-xs relative">
                                {f.image ? (
                                  <img src={f.image} className="h-full w-full object-cover" />
                                ) : (
                                  <span>{f.name ? f.name[0].toUpperCase() : "U"}</span>
                                )}
                                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-xs truncate">{f.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{f.role.toLowerCase()}</p>
                              </div>
                            </button>
                          ))}
                    </div>
                  </div>

                  {/* Right Chat Interface */}
                  <div className={`flex-1 flex flex-col bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-xs relative ${!showMobileChatSidebar ? "flex" : "hidden lg:flex"}`}>
                    
                    {/* Chat Header */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                      <div className="flex items-center min-w-0 gap-3">
                        {/* WhatsApp mobile back button */}
                        {!showMobileChatSidebar && (
                          <button
                            type="button"
                            onClick={() => setShowMobileChatSidebar(true)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all lg:hidden cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-wider shrink-0"
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
                                bg: "bg-[#002d59]",
                                icon: <Users className="h-4 w-4 text-white" />
                              };
                            }
                            if (activeChannel === "freelancers") {
                              return {
                                name: "Freelancers Private",
                                detail: "Private Freelancers-Only Thread",
                                image: null,
                                isGroup: true,
                                bg: "bg-amber-500",
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
                                  bg: "bg-slate-200",
                                  initial: companyName[0].toUpperCase()
                                };
                              }
                              const freelancer = hiredFreelancers.find(f => f.id === targetId);
                              return {
                                name: freelancer?.name || "User",
                                detail: freelancer?.role.toLowerCase() || "Workspace Professional",
                                image: freelancer?.image,
                                isGroup: false,
                                bg: "bg-[#002d59]",
                                initial: freelancer?.name ? freelancer.name[0].toUpperCase() : "U"
                              };
                            }
                            return {
                              name: "Chat Thread",
                              detail: "Direct messaging thread",
                              image: null,
                              isGroup: false,
                              bg: "bg-[#002d59]",
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
                                 className={`h-9 w-9 rounded-full ${headerInfo.bg} flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-xs relative ${
                                   isClickableDM ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                                 }`}
                               >
                                {headerInfo.isGroup ? (
                                  headerInfo.icon
                                ) : headerInfo.image ? (
                                  <img src={headerInfo.image} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-slate-705 font-bold">{headerInfo.initial}</span>
                                )}
                                {!headerInfo.isGroup && (
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3
                                   onClick={handleHeaderClick}
                                   className={`text-sm font-black text-slate-800 truncate ${
                                     isClickableDM ? "cursor-pointer hover:underline hover:text-[#3ac0ff]" : ""
                                   }`}
                                 >
                                  {headerInfo.name}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
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
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          showAIAssistant 
                            ? "bg-[#002d59] border-[#002d59] text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">AI Assistant</span>
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      
                      <div className="px-4 py-2 rounded-2xl bg-amber-50/60 border border-amber-200/30 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                          Important: Messages automatically clear after 7 days to maintain clean workspaces.
                        </p>
                      </div>

                      {messages.filter((m) => m.channel === activeChannel).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 p-8">
                          <MessageSquare className="h-8 w-8 text-slate-400" />
                          <p className="text-xs font-bold">Workspace thread is quiet.</p>
                          <p className="text-[10px]">Send a greeting message or files to begin collaboration.</p>
                        </div>
                      ) : (
                        messages.filter((m) => m.channel === activeChannel).map((msg) => {
                          const isMe = msg.senderId === currentUserId;
                          const isVoice = msg.content.startsWith("[VOICE:");

                          // Extract voice metadata
                          let voiceDur = "0:00";
                          if (isVoice) {
                            const durMatch = msg.content.match(/duration:([^\]]+)/);
                            if (durMatch) voiceDur = durMatch[1];
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
                                 className={`h-8 w-8 rounded-full bg-[#002d59] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-sm ${
                                   isFreelancerSender || msg.senderId === companyUser.id ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
                                 }`}
                               >
                                {msg.sender.image ? <img src={msg.sender.image} className="h-full w-full object-cover" /> : (msg.sender.name ? msg.sender.name[0].toUpperCase() : "U")}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className={`flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase ${isMe ? "justify-end" : ""}`}>
                                  <span
                                     onClick={handleSenderClick}
                                     className={isFreelancerSender || msg.senderId === companyUser.id ? "cursor-pointer hover:underline hover:text-[#3ac0ff]" : ""}
                                   >
                                     {msg.sender.name}
                                   </span>
                                  <span className="text-[7px] bg-slate-100 text-slate-500 px-1 rounded tracking-wider">{msg.sender.role.toLowerCase()}</span>
                                </div>

                                {/* Bubble content */}
                                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs break-words ${
                                  isMe
                                    ? "bg-gradient-to-r from-[#002d59] to-[#004282] text-white rounded-tr-none"
                                    : "bg-slate-200 text-slate-800 rounded-tl-none border border-slate-200/50"
                                }`}>
                                  {isVoice ? (
                                    <VoiceMessagePlayer content={msg.content} isMe={isMe} />
                                  ) : (
                                    msg.content
                                  )}
                                </div>

                                <div className={`text-[8px] text-slate-405 flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : ""}`}>
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>

                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Voice Recording Simulation Visual Overlay */}
                    {isRecordingVoice && (
                      <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-md text-slate-800 p-5 flex flex-col items-center justify-center gap-3 border-t border-slate-200 z-20">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">Recording Voice Message</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-8">
                          {voiceWave.map((h, i) => (
                            <div
                              key={i}
                              className="w-1.5 bg-[#3ac0ff] rounded-full transition-all duration-300 shadow-md shadow-sky-500/20"
                              style={{ height: `${h}px` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-extrabold text-slate-500">
                          {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60) < 10 ? "0" : ""}{recordingSeconds % 60}
                        </span>
                        <div className="flex gap-3 mt-1.5 text-xs">
                          <Button size="sm" variant="ghost" onClick={cancelVoiceRecording} className="text-slate-500 hover:text-slate-850 hover:bg-slate-100 cursor-pointer">
                            Cancel
                          </Button>
                          <Button size="sm" variant="secondary" onClick={stopAndSendVoice} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                            Send Message
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Chat Input form bar */}
                    <form onSubmit={(e) => handleSendMessage(e)} className="p-3.5 bg-slate-50 border-t border-slate-100 flex gap-2 items-center shrink-0">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileUpload(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className="p-2.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200/80 rounded-xl cursor-pointer transition-all"
                        title="Upload file attachment"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        disabled={isRecordingVoice}
                        className="p-2.5 bg-white hover:bg-slate-100 text-rose-600 border border-slate-200/80 rounded-xl cursor-pointer transition-all"
                        title="Record simulated voice message"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <Input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type message here..."
                        disabled={isSendingMessage || isUploadingFile}
                        className="flex-1 bg-white text-xs border-slate-200/80 text-slate-850"
                      />
                      <Button
                        type="submit"
                        disabled={isSendingMessage || !newMessage.trim() || isUploadingFile}
                        className="bg-[#002d59] hover:bg-[#001f3f] text-white font-bold text-xs h-9 cursor-pointer flex items-center gap-1"
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
                      className="w-full lg:w-[320px] bg-[#f0f6ff]/95 lg:bg-[#f0f6ff]/70 border border-slate-200/60 rounded-3xl p-4 flex flex-col h-full shadow-md lg:shadow-xs absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#002d59]" />
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Talentra AI Chat</h3>
                        </div>
                        <button type="button" onClick={() => setShowAIAssistant(false)} className="text-slate-400 hover:text-slate-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Conversation thread */}
                      <div ref={aiScrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 text-[11px] leading-relaxed">
                        {aiConversation.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                              {msg.sender === "user" ? "You" : "Talentra Assistant"}
                            </span>
                            <div className={`p-3 rounded-2xl max-w-[90%] shadow-xs leading-relaxed whitespace-pre-line ${
                              msg.sender === "user"
                                ? "bg-white text-slate-800 border border-slate-200/60 rounded-tr-none"
                                : "bg-gradient-to-tr from-[#002d59] to-[#004282] text-white rounded-tl-none"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isAITyping && (
                          <div className="flex items-center gap-1.5 py-1 text-slate-400 font-bold uppercase text-[9px]">
                            <Sparkles className="h-3.5 w-3.5 animate-spin text-[#3ac0ff]" />
                            <span>AI is processing project state...</span>
                          </div>
                        )}
                      </div>

                      {/* AI input form */}
                      <form onSubmit={handleAISubmit} className="mt-2 flex gap-1.5">
                        <Input
                          type="text"
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          placeholder="Ask AI assistant..."
                          className="text-[11px] bg-white h-8 py-1 focus:ring-[#002d59]/20"
                        />
                        <Button type="submit" size="sm" className="h-8 cursor-pointer bg-[#002d59] text-white">
                          <Send className="h-3 w-3" />
                        </Button>
                      </form>
                    </motion.div>
                  )}

                </div>
              )}

              {/* deliverables TAB */}
              {activeView === "deliverables" && (
                <div className="space-y-6">
                  
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                    <div>
                      <h2 className="text-base font-black text-slate-800">Workspace Deliverables</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Upload final files, track version iterations, and request revisions.
                      </p>
                    </div>
                    {role === "FREELANCER" && (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => handleFileUpload(e, deliverableVersionTargetId || undefined)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => { setDeliverableVersionTargetId(null); fileInputRef.current?.click(); }}
                          disabled={isUploadingFile}
                          className="bg-[#002d59] hover:bg-[#001f3f] text-white font-bold text-xs h-8 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Submit Deliverable</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {files.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                        <Archive className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-700">No deliverables shared yet.</p>
                      <p className="text-[10px] max-w-xs mx-auto">
                        Freelancers can submit final documents or files here for review, revision tracking, and final budget release.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {files.map((file) => {
                        const meta = parseDeliverableMeta(file.fileSize);
                        return (
                          <Card key={file.id} className="border border-slate-200/60 p-5 bg-white relative hover:shadow-md transition-all flex flex-col justify-between gap-4">
                            
                            {/* Version and status header */}
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-[#002d59] bg-[#3ac0ff]/20 px-2 py-0.5 rounded-lg border border-[#3ac0ff]/30 text-[9px] uppercase tracking-wider">
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
                                className="text-[8px] font-black uppercase tracking-wider px-2"
                              >
                                {meta.status.replace("_", " ")}
                              </Badge>
                            </div>

                            {/* File Name & details */}
                            <div className="min-w-0 py-2">
                              <h4 className="font-extrabold text-slate-800 truncate text-sm" title={file.fileName}>
                                {file.fileName}
                              </h4>
                              <p className="text-[10px] text-slate-450 mt-1">
                                Size: {meta.size} • Shared: {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                              {meta.feedback && (
                                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] leading-relaxed text-slate-600 max-h-[80px] overflow-y-auto">
                                  <strong className="block text-slate-700 font-bold uppercase text-[8px] tracking-wider mb-0.5">Feedback:</strong>
                                  {meta.feedback}
                                </div>
                              )}
                            </div>

                            {/* Actions bar */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                              
                              <div className="flex items-center gap-1.5">
                                {/* Download */}
                                <a
                                  href={file.fileUrl}
                                  download={file.fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#002d59] transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                                {/* Preview */}
                                <button
                                  onClick={() => setSelectedPreviewFile(file)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#002d59] transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Preview File"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                {/* Delete */}
                                {(role === "COMPANY" || file.uploadedById === currentUserId) && (
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer inline-flex items-center justify-center"
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
                                      fileInputRef.current?.click();
                                    }}
                                    size="xs"
                                    variant="secondary"
                                    className="text-[9px] font-black uppercase tracking-wider py-1 h-7 cursor-pointer"
                                  >
                                    Submit New Version
                                  </Button>
                                )}
                                {role === "COMPANY" && meta.status === "PENDING" && (
                                  <Button
                                    onClick={() => setSelectedPreviewFile(file)}
                                    size="xs"
                                    variant="primary"
                                    className="text-[9px] font-black uppercase tracking-wider py-1 h-7 cursor-pointer"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }} />
                      <div className="relative w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
                        <div className="h-1.5 bg-gradient-to-r from-[#002d59] to-[#3ac0ff]" />
                        
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] bg-sky-100 text-[#002d59] border border-sky-200/50 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                File Previewer Lightbox
                              </span>
                              <h3 className="font-extrabold text-[#002d59] text-base truncate mt-1 max-w-[400px]">
                                {selectedPreviewFile.fileName}
                              </h3>
                            </div>
                            <button
                              onClick={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Simulated Sandbox File Previewer */}
                          <div className="h-[240px] bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
                            {selectedPreviewFile.fileName.endsWith(".png") || selectedPreviewFile.fileName.endsWith(".jpg") || selectedPreviewFile.fileName.endsWith(".jpeg") ? (
                              <img src={selectedPreviewFile.fileUrl} className="h-full w-full object-contain" alt="Preview Image" />
                            ) : selectedPreviewFile.fileName.endsWith(".js") || selectedPreviewFile.fileName.endsWith(".ts") || selectedPreviewFile.fileName.endsWith(".tsx") || selectedPreviewFile.fileName.endsWith(".html") || selectedPreviewFile.fileName.endsWith(".json") ? (
                              <div className="w-full h-full p-4 font-mono text-[9px] text-slate-700 leading-normal overflow-y-auto whitespace-pre bg-slate-900 border-none text-left">
                                <span className="text-emerald-450 font-bold block">// talentra workspace deliverable sandbox viewer</span>
                                <span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-amber-300">"react"</span>;{"\n"}
                                <span className="text-purple-400">export default function</span> Component() &#123;{"\n"}
                                {"  "}return ({"\n"}
                                {"    "}&lt;<span className="text-[#3ac0ff]">div</span> className=<span className="text-amber-300">"workspace-render"</span>&gt;{"\n"}
                                {"      "}&lt;<span className="text-[#3ac0ff]">h1</span>&gt;Redesigned Page Sandbox Preview Successfully Loaded&lt;/<span className="text-[#3ac0ff]">h1</span>&gt;{"\n"}
                                {"    "}&lt;/<span className="text-[#3ac0ff]">div</span>&gt;{"\n"}
                                {"  "});{"\n"}
                                &#125;;
                              </div>
                            ) : (
                              <div className="text-center p-6 space-y-2">
                                <Archive className="h-10 w-10 text-slate-300 mx-auto" />
                                <p className="text-xs font-bold text-slate-700">Document Sandbox Viewer</p>
                                <p className="text-[10px] text-slate-400">
                                  File: {selectedPreviewFile.fileName} ({parseDeliverableMeta(selectedPreviewFile.fileSize).size})
                                </p>
                                <a
                                  href={selectedPreviewFile.fileUrl}
                                  download
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#002d59] font-bold text-[10px] mt-2 cursor-pointer"
                                >
                                  <Download className="h-3 w-3" /> Download to view contents
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Client review feedback form details */}
                          {role === "COMPANY" && parseDeliverableMeta(selectedPreviewFile.fileSize).status === "PENDING" ? (
                            <div className="space-y-3 pt-3 border-t border-slate-200">
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                Audit Review Feedback (Required)
                              </label>
                              <textarea
                                value={reviewFeedback}
                                onChange={(e) => setReviewFeedback(e.target.value)}
                                placeholder="State review approval remarks or specific revision requests guidelines..."
                                rows={2.5}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-xs text-slate-800 bg-white"
                              />
                              <div className="flex justify-end gap-2 pt-1 text-xs">
                                <Button
                                  onClick={() => handleReviewDeliverable(selectedPreviewFile.id, "REVISION_REQUESTED")}
                                  disabled={isReviewing || !reviewFeedback.trim()}
                                  className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100/50 text-[10px] font-black uppercase tracking-wider px-4 cursor-pointer"
                                >
                                  Request Revisions
                                </Button>
                                <Button
                                  onClick={() => handleReviewDeliverable(selectedPreviewFile.id, "APPROVED")}
                                  disabled={isReviewing || !reviewFeedback.trim()}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-4 cursor-pointer"
                                >
                                  Approve Submission
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-2 text-xs">
                              <Button
                                onClick={() => { setSelectedPreviewFile(null); setReviewFeedback(""); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 cursor-pointer"
                              >
                                Close
                              </Button>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* tasks TAB */}
              {activeView === "tasks" && (
                <div className="space-y-6">
                  
                  {/* Kanban toolbar */}
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-3.5 border-b border-slate-200/60">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div>
                        <h2 className="text-base font-black text-slate-800">
                          {taskViewMode === "board" ? "Kanban Board" : "Freelancer Work Ledger"}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {taskViewMode === "board" 
                            ? "Coordinate execution cycles and audit progress indicators." 
                            : "Observe completed tasks chronologically by completion date."}
                        </p>
                      </div>

                      {/* View Switcher Toggle */}
                      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit shrink-0">
                        <button
                          type="button"
                          onClick={() => setTaskViewMode("board")}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            taskViewMode === "board"
                              ? "bg-white text-[#002d59] shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Kanban Board
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskViewMode("timeline")}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            taskViewMode === "timeline"
                              ? "bg-white text-[#002d59] shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Work Timeline
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 text-xs items-center justify-between sm:justify-end w-full md:w-auto">
                      <div className="relative w-full sm:w-48 shrink-0">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="text"
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          placeholder="Search tasks..."
                          className="pl-8 bg-white h-8 text-[11px] border-slate-200/80"
                        />
                      </div>
                      <Button
                        onClick={() => setShowAddTaskModal(true)}
                        className="bg-[#002d59] hover:bg-[#001f3f] text-white font-bold text-xs h-8 flex items-center gap-1 cursor-pointer"
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
                      {(["TODO", "IN_PROGRESS", "DONE"] as const).map((col) => {
                        const colTasks = filteredTasksList.filter(t => t.status === col);
                        return (
                          <div key={col} className="bg-slate-100/40 border border-slate-200/40 rounded-2xl p-4 flex flex-col min-h-[440px]">
                            
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/50 mb-3.5">
                              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                {col === "TODO" && "📋 To Do"}
                                {col === "IN_PROGRESS" && "⚡ In Progress"}
                                {col === "DONE" && "✅ Done"}
                              </span>
                              <Badge variant="neutral" className="px-2">{colTasks.length}</Badge>
                            </div>

                            {/* Task Cards Container */}
                            <div className="flex-1 space-y-3.5">
                              {colTasks.length === 0 ? (
                                <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                  Empty Column
                                </div>
                              ) : (
                                colTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setShowTaskDetailModal(true); }}
                                    className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-[#3ac0ff]/50 transition-all cursor-pointer group flex flex-col gap-3"
                                  >
                                    <div className="flex justify-between items-start gap-2.5">
                                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#002d59] transition-colors leading-snug line-clamp-2">
                                        {task.title}
                                      </h4>
                                      <Badge
                                        className="text-[7px] font-black uppercase tracking-wider px-1.5 shrink-0"
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
                                      <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Card Footer: details and status cycles */}
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[9px] text-slate-400">
                                      
                                      <div className="flex items-center gap-1">
                                        {task.dueDate ? (
                                          <>
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span>{new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                                          </>
                                        ) : (
                                          <span>No due date</span>
                                        )}
                                      </div>

                                      {/* Action tags to move task column */}
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {col !== "TODO" && (
                                          <button
                                            onClick={() => handleUpdateTaskStatus(task.id, col === "DONE" ? "IN_PROGRESS" : "TODO")}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                                            title="Move Left"
                                          >
                                            &larr;
                                          </button>
                                        )}
                                        {col !== "DONE" && (
                                          <button
                                            onClick={() => handleUpdateTaskStatus(task.id, col === "TODO" ? "IN_PROGRESS" : "DONE")}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all font-bold"
                                            title="Move Right"
                                          >
                                            &rarr;
                                          </button>
                                        )}
                                      </div>

                                      {/* Avatar */}
                                      <div className="h-5.5 w-5.5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-[8px] overflow-hidden shrink-0">
                                        {task.assignedTo?.image ? (
                                          <img src={task.assignedTo.image} alt={task.assignedTo.name || ""} className="h-full w-full object-cover" />
                                        ) : (
                                          task.assignedTo?.name ? task.assignedTo.name[0].toUpperCase() : "U"
                                        )}
                                      </div>

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
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <span className="text-[9px] font-black text-[#002d59] uppercase tracking-wider block">Freelancer Activity Dashboard</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Filter badge for ALL */}
                            <button
                              type="button"
                              onClick={() => setSelectedFreelancerFilter("all")}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedFreelancerFilter === "all"
                                  ? "bg-[#002d59] border-[#002d59] text-white shadow-sm font-black"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span>👥 All Freelancers</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                                selectedFreelancerFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-700"
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
                                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    selectedFreelancerFilter === freelancer.id
                                      ? "bg-[#002d59]/10 border-[#002d59]/40 text-[#002d59] font-black ring-1 ring-[#002d59]/30 shadow-xs"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="h-4 w-4 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                                    {freelancer.image ? (
                                      <img src={freelancer.image} alt={freelancer.name || ""} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="flex items-center justify-center h-full w-full text-[7px] font-bold bg-[#002d59] text-white">
                                        {freelancer.name ? freelancer.name[0].toUpperCase() : "F"}
                                      </span>
                                    )}
                                  </div>
                                  <span>{freelancer.name || "Freelancer"}</span>
                                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                                    selectedFreelancerFilter === freelancer.id ? "bg-[#002d59]/20 text-[#002d59]" : "bg-slate-200/60 text-slate-700"
                                  }`}>
                                    {freelancerDoneCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Summary metrics */}
                        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 md:border-l border-slate-200 md:pl-4">
                          <div className="text-center md:text-left shrink-0">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Logged Work</span>
                            <span className="text-lg font-black text-[#002d59]">{completedTasks.length} Done</span>
                          </div>
                          {(selectedFreelancerFilter !== "all" || taskSearch) && (
                            <button
                              type="button"
                              onClick={() => { setSelectedFreelancerFilter("all"); setTaskSearch(""); }}
                              className="text-[9px] font-bold text-[#002d59] hover:text-[#001f3f] underline cursor-pointer shrink-0"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display results */}
                      {completedTasks.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 space-y-3 bg-white border border-slate-200/60 rounded-3xl p-8 shadow-xs">
                          <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                            <CheckSquare className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-extrabold text-slate-700">No completed tasks match your criteria.</p>
                          <p className="text-[10px] max-w-xs mx-auto">
                            {tasks.filter(t => t.status === "DONE").length === 0 
                              ? "Freelancer work progress will be logged here chronologically as soon as tasks are moved to the \"Done\" column."
                              : "Try clearing search keywords or resetting active freelancer filters."
                            }
                          </p>
                          {(selectedFreelancerFilter !== "all" || taskSearch) && (
                            <Button
                              type="button"
                              onClick={() => { setSelectedFreelancerFilter("all"); setTaskSearch(""); }}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 h-8 cursor-pointer mt-2"
                            >
                              Reset Active Filters
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 py-2 space-y-8">
                          {sortedDates.map((dateStr) => (
                            <div key={dateStr} className="relative space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                              {/* Timeline dot */}
                              <div className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full bg-white border-4 border-[#002d59] shadow-sm" />
                              
                              {/* Date Header */}
                              <div className="inline-block bg-[#002d59]/5 border border-[#002d59]/10 rounded-xl px-3 py-1">
                                <span className="text-[10px] font-black text-[#002d59] uppercase tracking-wider">
                                  {dateStr}
                                </span>
                              </div>

                              {/* Completed tasks list */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupedTimeline[dateStr].map((task) => (
                                  <Card
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setShowTaskDetailModal(true); }}
                                    className="p-4 bg-white border border-slate-200 hover:border-[#002d59]/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-extrabold text-slate-800 text-xs group-hover:text-[#002d59] transition-colors leading-tight line-clamp-1">
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
                                          className="text-[7px] font-black uppercase tracking-wider px-1.5 shrink-0"
                                        >
                                          {task.priority}
                                        </Badge>
                                      </div>
                                      {task.description && (
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[10px]">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6.5 w-6.5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-[9px] overflow-hidden shrink-0">
                                          {task.assignedTo?.image ? (
                                            <img src={task.assignedTo.image} alt={task.assignedTo.name || ""} className="h-full w-full object-cover" />
                                          ) : (
                                            task.assignedTo?.name ? task.assignedTo.name[0].toUpperCase() : "U"
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-slate-700 truncate leading-tight">{task.assignedTo?.name || "Unassigned"}</p>
                                          <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Completed By</p>
                                        </div>
                                      </div>

                                      <div className="text-right text-slate-400">
                                        <span className="text-[8px] font-black uppercase block tracking-wider text-slate-400">Time Logged</span>
                                        <span className="font-extrabold text-slate-700">
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

              {/* team TAB */}
              {activeView === "team" && (
                <div className="space-y-6">
                  
                  <div>
                    <h2 className="text-base font-black text-slate-800">Team Directory</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Collaborator profiles, reputation indices, and verified professional skills.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Freelancer Profile card */}
                    {hiredFreelancers.map((freelancer) => (
                      <Card key={freelancer.id} className="border border-slate-200/60 p-6 bg-white shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-700 font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/10">
                          Active Contractor
                        </div>

                        <div className="flex gap-4 items-start">
                          <div
                             onClick={() => {
                               router.push(`/freelancers/${freelancer.freelancerId}`);
                             }}
                             className="h-16 w-16 rounded-full bg-[#002d59]/10 border border-slate-200 flex items-center justify-center font-bold text-xl text-[#002d59] overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                           >
                            {freelancer.image ? <img src={freelancer.image} className="h-full w-full object-cover" /> : freelancer.name?.[0].toUpperCase()}
                          </div>
                          
                          <div className="space-y-1.5 min-w-0">
                            <h3
                               onClick={() => {
                                 router.push(`/freelancers/${freelancer.freelancerId}`);
                               }}
                               className="font-extrabold text-slate-850 text-base truncate cursor-pointer hover:underline hover:text-[#002d59]"
                            >
                               {freelancer.name}
                            </h3>
                            <p className="text-[11px] font-bold text-[#002d59] uppercase tracking-wide">Freelancer Professional</p>
                            
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex items-center text-amber-500 font-bold text-xs">
                                ★ 4.9 <span className="text-slate-400 font-medium ml-1">(24 reviews)</span>
                              </div>
                              <span className="text-slate-300">•</span>
                              <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">
                                98% Reputation Score
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5 text-xs text-slate-600 font-medium">
                          <div>
                            <strong className="block text-slate-700 font-bold uppercase text-[9px] tracking-wider mb-1.5">Verified Professional Skills:</strong>
                            <div className="flex flex-wrap gap-1.5">
                              {["React", "TypeScript", "NextJS", "Prisma ORM", "TailwindCSS", "PostgreSQL"].map((sk, idx) => (
                                <Badge key={idx} variant="primary" className="text-[8px] font-black uppercase tracking-wider py-0.5 px-2">
                                  {sk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-[10px] font-medium pt-1.5">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Avg Response Time</span>
                              <span className="text-slate-800 font-extrabold mt-0.5 block">Under 12 Hours</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">On-Time Delivery</span>
                              <span className="text-slate-800 font-extrabold mt-0.5 block">100% Satisfaction</span>
                            </div>
                          </div>
                        </div>

                      </Card>
                    ))}

                    {/* Client Profile Card */}
                    <Card className="border border-slate-200/60 p-6 bg-white shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#002d59]/10 text-[#002d59] font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-[#002d59]/10">
                        Employer Owner
                      </div>

                      <div className="flex gap-4 items-start">
                        <div
                          onClick={() => {
                            router.push(`/companies/${companyUser.companyId}`);
                          }}
                          className="h-16 w-16 rounded-full bg-[#002d59] border border-slate-200 flex items-center justify-center font-bold text-xl text-white overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          {companyUser.image ? <img src={companyUser.image} className="h-full w-full object-cover" /> : "C"}
                        </div>
                        
                        <div className="space-y-1.5 min-w-0">
                          <h3
                            onClick={() => {
                              router.push(`/companies/${companyUser.companyId}`);
                            }}
                            className="font-extrabold text-slate-850 text-base truncate cursor-pointer hover:underline hover:text-[#002d59]"
                          >
                            {companyName}
                          </h3>
                          <p className="text-[11px] font-bold text-[#002d59] uppercase tracking-wide">Client Organization</p>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center text-amber-500 font-bold text-xs">
                              ★ 4.8 <span className="text-slate-400 font-medium ml-1">(12 reviews)</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <div className="text-[10px] text-[#002d59] font-black uppercase tracking-wider">
                              99% Payment Reliability
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5 text-xs text-slate-600 font-medium">
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-medium">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Company Size</span>
                            <span className="text-slate-800 font-extrabold mt-0.5 block">10-50 Employees</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Location</span>
                            <span className="text-slate-800 font-extrabold mt-0.5 block">San Francisco, CA</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Founded Year</span>
                            <span className="text-slate-800 font-extrabold mt-0.5 block">2021</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Trust Score</span>
                            <span className="text-emerald-600 font-extrabold mt-0.5 block">95/100 Verified</span>
                          </div>
                        </div>
                      </div>

                    </Card>

                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

      {/* MODAL: CREATE KANBAN TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowAddTaskModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
            <div className="h-1.5 bg-gradient-to-r from-[#002d59] to-[#3ac0ff]" />
            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-[#002d59] text-base">Create Kanban Task</h3>
                <button type="button" onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Task Title</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Implement user dashboard checkout button"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Provide checklist details or specific task guidelines..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-xs text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
                  >
                    <option value="LOW">🔵 Low</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HIGH">🔴 High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="bg-white border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Assignee</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
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
                <Button type="submit" disabled={isSubmittingTask || !newTaskTitle.trim()} className="bg-[#002d59] text-white hover:bg-[#001f3f] text-xs font-bold px-4 cursor-pointer">
                  {isSubmittingTask ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT/DETAIL KANBAN TASK */}
      {showTaskDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => { setShowTaskDetailModal(false); setSelectedTask(null); }} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
            <div className="h-1.5 bg-[#002d59]" />
            <form onSubmit={handleUpdateTaskDetails} className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-[#002d59] text-base">Task Details</h3>
                <button type="button" onClick={() => { setShowTaskDetailModal(false); setSelectedTask(null); }} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Task Title</label>
                <Input
                  type="text"
                  required
                  value={selectedTask.title}
                  onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={selectedTask.description || ""}
                  onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-xs text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
                  >
                    <option value="LOW">🔵 Low</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HIGH">🔴 High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                  <Input
                    type="date"
                    value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value ? new Date(e.target.value) : null })}
                    className="bg-white border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Assignee</label>
                  <select
                    value={selectedTask.assignedToId || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, assignedToId: e.target.value || null })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
                  >
                    <option value="">Unassigned</option>
                    <option value={companyUser.id}>{companyUser.name} (Client Manager)</option>
                    {hiredFreelancers.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} (Freelancer)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Status Board</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
                  >
                    <option value="TODO">📋 To Do</option>
                    <option value="IN_PROGRESS">⚡ In Progress</option>
                    <option value="DONE">✅ Done</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  variant="outline"
                  className="text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button onClick={() => { setShowTaskDetailModal(false); setSelectedTask(null); }} variant="outline" className="text-xs font-bold px-4 cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdatingTask || !selectedTask.title.trim()} className="bg-[#002d59] text-white hover:bg-[#001f3f] text-xs font-bold px-4 cursor-pointer">
                    {isUpdatingTask ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MILESTONE PHASE */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowAddMilestoneModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
            <div className="h-1.5 bg-gradient-to-r from-[#002d59] to-[#3ac0ff]" />
            <form onSubmit={handleCreateMilestone} className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-[#002d59] text-base">Create Milestone Phase</h3>
                <button type="button" onClick={() => setShowAddMilestoneModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Milestone Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Core landing page layout designs"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Milestone Budget Value ($)</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 1500"
                  value={newMilestoneValue}
                  onChange={(e) => setNewMilestoneValue(e.target.value)}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Deliverable Criteria Description</label>
                <textarea
                  placeholder="Explain exactly what criteria the freelancer needs to satisfy to release this payment amount..."
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-xs text-slate-800 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setShowAddMilestoneModal(false)} variant="outline" className="text-xs font-bold px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingMilestone || !newMilestoneTitle.trim() || !newMilestoneValue.trim()} className="bg-[#002d59] text-white hover:bg-[#001f3f] text-xs font-bold px-4 cursor-pointer">
                  {isSubmittingMilestone ? "Creating..." : "Fund Milestone Phase"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
