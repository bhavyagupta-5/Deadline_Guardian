import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Task, 
  ScheduleBlock, 
  CalendarEvent, 
  Goal, 
  Habit, 
  UserPattern, 
  ChatMessage, 
  AutonomousLog,
  DBState,
  SubTask
} from "./types";
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  Zap, 
  Plus, 
  Send, 
  Mic, 
  GripVertical, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Calendar, 
  TrendingUp, 
  ShieldAlert, 
  Settings, 
  Bell,
  BellRing, 
  RefreshCw, 
  User, 
  LayoutDashboard, 
  Bot, 
  Activity, 
  BookOpen, 
  CheckSquare, 
  X,
  Search,
  Target,
  FileText,
  ChevronRight,
  Info,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Coffee,
  Sun,
  Moon
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

export default function App() {
  // DB State
  const [db, setDb] = useState<DBState>({
    tasks: [],
    schedule_blocks: [],
    calendar_events: [],
    goals: [],
    habits: [],
    patterns: [],
    conversations: [],
    autonomous_logs: []
  });

  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'calendar' | 'goals' | 'patterns' | 'logs'>('dashboard');

  // Interactive Form States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>("assignment");
  const [newTaskHoursOffset, setNewTaskHoursOffset] = useState("1.5"); // hours from now
  const [newTaskEstMins, setNewTaskEstMins] = useState("60");
  const [newTaskEnergy, setNewTaskEnergy] = useState<Task['energy_level']>("medium");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // New Goal & Habit form states
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState("career");
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>("daily");

  // Chat/Agent States
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Subtask Generation Loading IDs
  const [generatingSubtasksId, setGeneratingSubtasksId] = useState<string | null>(null);

  // General Actions Loading states
  const [autoPlanning, setAutoPlanning] = useState(false);
  const [runningAutonomousTick, setRunningAutonomousTick] = useState(false);
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);

  // Pomodoro Focus Timer State
  const [pomoTaskId, setPomoTaskId] = useState<string>("");
  const [pomoSecondsRemaining, setPomoSecondsRemaining] = useState<number>(1500); // 1500s = 25m
  const [pomoIsActive, setPomoIsActive] = useState<boolean>(false);
  const [pomoSessionType, setPomoSessionType] = useState<'work' | 'break'>('work');
  const [pomoCompletedCount, setPomoCompletedCount] = useState<number>(0);

  // Task search/filter states
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("all");

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null);

  // Toast and Notification System
  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'success' | 'danger';
  }[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const notifiedTaskIdsRef = useRef<Record<string, boolean>>({});

  const addToast = (title: string, description: string, type: 'info' | 'warning' | 'success' | 'danger' = 'warning') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification("DeadlineGuardian Alert System Active", {
            body: "You will receive desktop alerts when task deadlines are within 30 minutes.",
          });
        }
      } catch (err) {
        console.error("Failed to request notification permission:", err);
      }
    }
  };

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Periodic deadline notification checker
  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();
      const thirtyMinutesInMs = 30 * 60 * 1000;
      
      db.tasks.forEach(task => {
        if (task.status === "done") return;
        if (!task.deadline) return;

        const deadlineTime = new Date(task.deadline).getTime();
        const timeUntilDeadline = deadlineTime - now;

        // Trigger if deadline is within 30 minutes, has not passed, and we haven't notified yet
        if (timeUntilDeadline > 0 && timeUntilDeadline <= thirtyMinutesInMs) {
          if (!notifiedTaskIdsRef.current[task.id]) {
            notifiedTaskIdsRef.current[task.id] = true;

            const minutesLeft = Math.round(timeUntilDeadline / (1000 * 60));
            const toastTitle = "⚠️ Deadline Proximity Alert!";
            const toastDesc = `"${task.title}" is due in ${minutesLeft} minutes. Secure this commitment now!`;

            // 1. Trigger beautiful in-app toast
            addToast(toastTitle, toastDesc, 'danger');

            // 2. Play warning chime
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
              osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.12); // E5
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.35);
            } catch (e) {
              console.warn("Chime playback failed:", e);
            }

            // 3. Optional Voice read-aloud
            if (readAloud) {
              handleSpeak(`Attention! Your commitment "${task.title}" is due in ${minutesLeft} minutes. Maintain focus to avert an overcommitment failure!`);
            }

            // 4. Fallback browser native alert (non-blocking if possible, inside timeout)
            setTimeout(() => {
              try {
                alert(`⚠️ DEADLINE THREAT DETECTED!\n\nTask: "${task.title}"\nDue in: ${minutesLeft} minutes.\n\nTake immediate action to secure this target!`);
              } catch (err) {
                console.warn("Native alert blocked:", err);
              }
            }, 300);

            // 5. HTML5 Browser system Notification
            try {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification("DeadlineGuardian Threat Alert!", {
                  body: `"${task.title}" is due in ${minutesLeft} minutes!`,
                });
              }
            } catch (err) {
              console.error("Browser system Notification failed:", err);
            }
          }
        }
      });
    };

    // Run the check immediately on task updates
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [db.tasks, readAloud]);

  // Pomodoro timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (pomoIsActive && pomoSecondsRemaining > 0) {
      interval = setInterval(() => {
        setPomoSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (pomoIsActive && pomoSecondsRemaining === 0) {
      handlePomodoroComplete();
    }
    return () => clearInterval(interval);
  }, [pomoIsActive, pomoSecondsRemaining]);

  const handlePomodoroComplete = async () => {
    setPomoIsActive(false);
    
    // Play sound if possible using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context sound failed", e);
    }

    if (pomoSessionType === 'work') {
      setPomoCompletedCount(prev => prev + 1);
      
      const currentTask = db.tasks.find(t => t.id === pomoTaskId) || db.tasks.filter(t => t.status !== "done").sort((a,b) => b.priority_score - a.priority_score)[0];
      const taskTitle = currentTask ? currentTask.title : "High-Priority Focus Task";
      const taskId = currentTask ? currentTask.id : "";

      // Speak some dynamic congratulatory feedback if readAloud is enabled
      handleSpeak(`Outstanding job! You completed a full 25 minute focus session for "${taskTitle}". Make sure to take a 5 minute break now to recover your cognitive energy!`);

      // Log it to backend autonomous logs
      try {
        const response = await fetchWithAuth("/api/pomodoro/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            durationMinutes: 25,
            title: taskTitle
          })
        });
        if (response.ok) {
          await fetchData();
        }
      } catch (err) {
        console.error("Failed to log pomodoro session:", err);
      }
      
      // Auto toggle to break session type and set break time to 5 minutes
      setPomoSessionType('break');
      setPomoSecondsRemaining(300); // 5 mins break
      alert(`🎉 25-minute Work Session Completed!\nGreat work on "${taskTitle}"! Take a well-deserved 5-minute break now.`);
    } else {
      // Break completed
      handleSpeak("Break time is over! Your cognitive battery is restored. Ready to tackle your next high-priority target?");
      setPomoSessionType('work');
      setPomoSecondsRemaining(1500); // 25 mins work
      alert(`⏱️ Break completed!\nReady to focus? Let's start the next 25-minute focus block.`);
    }
  };

  // Auto select highest priority task when tasks list changes
  useEffect(() => {
    const pending = db.tasks.filter(t => t.status !== "done").sort((a,b) => b.priority_score - a.priority_score);
    if (pending.length > 0 && (!pomoTaskId || !db.tasks.some(t => t.id === pomoTaskId))) {
      setPomoTaskId(pending[0].id);
    }
  }, [db.tasks, pomoTaskId]);

  // For auto-scroll chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
    checkSpeechSupport();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [db.conversations, chatLoading]);

  // Speech Recognition Setup
  const checkSpeechSupport = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => setRecording(true);
      rec.onend = () => setRecording(false);
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        if (text) {
          setChatInput(prev => prev ? prev + " " + text : text);
        }
      };
      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setRecording(false);
      };
      recognitionRef.current = rec;
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSpeak = (text: string) => {
    if (!readAloud) return;
    // Strip markdown formatting if any for cleaner audio speech
    const cleanText = text.replace(/[*_#`\[\]()]/g, '');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  };

  const [token, setToken] = useState<string | null>(localStorage.getItem("dg_token"));
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const authHeaders = {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": options.headers && (options.headers as any)["Content-Type"] ? (options.headers as any)["Content-Type"] : "application/json"
    };
    
    // For GET or simple requests, remove Content-Type if body is not present to avoid browser warnings
    if (!options.body && authHeaders["Content-Type"] === "application/json") {
      delete (authHeaders as any)["Content-Type"];
    }

    const res = await fetch(url, {
      ...options,
      headers: authHeaders
    });
    
    if (res.status === 401) {
      handleLogout();
      throw new Error("Unauthorized");
    }
    
    return res;
  };

  const handleLogout = () => {
    localStorage.removeItem("dg_token");
    setToken(null);
    setUser(null);
    setDb({
      tasks: [],
      schedule_blocks: [],
      calendar_events: [],
      goals: [],
      habits: [],
      patterns: [],
      conversations: [],
      autonomous_logs: []
    });
    addToast("Logged Out", "You have been securely logged out of your session.", "info");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Please fill out all fields.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);

      const endpoint = authMode === 'login' ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("dg_token", data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthUsername("");
      setAuthPassword("");
      addToast(
        authMode === 'login' ? "Welcome Back!" : "Account Registered!",
        authMode === 'login' 
          ? `Authenticated successfully as ${data.user.username}.`
          : `Your DeadlineGuardian secure workspace has been provisioned!`,
        "success"
      );
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await fetchWithAuth("/api/data");
      const data = await res.json();
      setDb(data);
      setIsGeminiConfigured(data.isGeminiConfigured);
    } catch (err) {
      console.error("Error loading application state:", err);
    } finally {
      setLoading(false);
    }
  };

  // Authenticated profile verification effect
  useEffect(() => {
    if (token) {
      fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          setUser(data.user);
          fetchData();
        }
      })
      .catch(err => {
        console.error("Auth validation failed", err);
        handleLogout();
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleResetData = async () => {
    if (!window.confirm("Are you sure you want to reset all data back to clean factory seed defaults?")) return;
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/data/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDb(data.state);
        setIsGeminiConfigured(data.state.isGeminiConfigured ?? isGeminiConfigured);
      }
    } catch (err) {
      console.error("Reset data error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setIsAddingTask(true);
      // Calculate deadline date string based on hours offset from now
      const d = new Date();
      d.setMinutes(d.getMinutes() + parseFloat(newTaskHoursOffset) * 60);

      const response = await fetchWithAuth("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          deadline: d.toISOString(),
          estimated_minutes: parseInt(newTaskEstMins) || 30,
          category: newTaskCategory,
          energy_level: newTaskEnergy,
          subtasks: []
        })
      });

      if (!response.ok) throw new Error("Failed to add task");
      
      // Refresh entire state to fetch priorities
      await fetchData();

      // Clear input fields
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskHoursOffset("1.5");
      setNewTaskEstMins("60");
    } catch (err) {
      console.error("Add task error", err);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("Failed status update");
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSubtasks = async (taskId: string, subtasks: SubTask[]) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtasks })
      });
      if (!response.ok) throw new Error("Failed subtask update");
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropTask = async (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDraggedOverTaskId(null);
      return;
    }

    const currentPendingIds = pendingTasks.map(t => t.id);
    const fromIndex = currentPendingIds.indexOf(draggedTaskId);
    const toIndex = currentPendingIds.indexOf(targetTaskId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updatedIds = [...currentPendingIds];
      updatedIds.splice(fromIndex, 1);
      updatedIds.splice(toIndex, 0, draggedTaskId);

      try {
        const res = await fetchWithAuth("/api/tasks/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: updatedIds })
        });
        const data = await res.json();
        if (data.success) {
          setDb(prev => {
            const updatedTasks = prev.tasks.map(t => {
              const idxInOrder = updatedIds.indexOf(t.id);
              if (idxInOrder !== -1) {
                return { ...t, custom_order: idxInOrder };
              }
              return t;
            });
            return { ...prev, tasks: updatedTasks };
          });
        }
      } catch (err) {
        console.error("Failed to persist task re-ordering:", err);
      }
    }

    setDraggedTaskId(null);
    setDraggedOverTaskId(null);
  };

  const handleTriggerSubtaskGen = async (taskId: string) => {
    try {
      setGeneratingSubtasksId(taskId);
      const res = await fetchWithAuth(`/api/tasks/${taskId}/subtasks`, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed subtask breakdown");
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to auto-generate subtasks.");
    } finally {
      setGeneratingSubtasksId(null);
    }
  };

  const handleAutoPlanDay = async () => {
    try {
      setAutoPlanning(true);
      const res = await fetchWithAuth("/api/schedule/auto-plan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        // Speak encouragement
        if (data.reasoning) {
          handleSpeak(data.reasoning);
        }
      } else {
        alert(data.error || "Failed to schedule automatically.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAutoPlanning(false);
    }
  };

  const handleTriggerAutonomousTick = async () => {
    try {
      setRunningAutonomousTick(true);
      const res = await fetchWithAuth("/api/agent/autonomous-tick", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        if (data.log && data.log.description) {
          // Play notification chime and speak
          handleSpeak(data.log.description);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningAutonomousTick(false);
    }
  };

  const handleTriggerPatternAnalysis = async () => {
    try {
      setAnalyzingPatterns(true);
      const res = await fetchWithAuth("/api/patterns/analyze", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingPatterns(false);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const messageToSend = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    try {
      // Append user message immediately for real-time responsiveness
      const tempUserMsg: ChatMessage = {
        id: `temp-u-${Date.now()}`,
        role: "user",
        content: messageToSend,
        created_at: new Date().toISOString()
      };
      setDb(prev => ({
        ...prev,
        conversations: [...prev.conversations, tempUserMsg]
      }));

      const res = await fetchWithAuth("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend })
      });

      if (!res.ok) throw new Error("Failed to chat with agent");
      const data = await res.json();
      
      // Update with exact synchronized state
      setDb(data.dbState);
      
      // Speak assistant reply if read aloud is toggled
      if (data.reply) {
        handleSpeak(data.reply);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // Add dummy calendar event to trigger responsive calendar updates
  const handleAddCalendarEvent = async () => {
    const title = prompt("Enter Calendar Event Name:", "Product Launch Webinar");
    if (!title) return;
    const hoursOffset = prompt("Hours offset from now:", "5");
    if (!hoursOffset) return;

    const dStart = new Date();
    dStart.setMinutes(dStart.getMinutes() + parseFloat(hoursOffset) * 60);
    const dEnd = new Date(dStart.getTime() + 60 * 60 * 1000); // 1hr duration

    try {
      const res = await fetchWithAuth("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start_time: dStart.toISOString(),
          end_time: dEnd.toISOString()
        })
      });
      if (res.ok) {
        await fetchData();
        addToast("Calendar Synced", `Scheduled focus session block around "${title}".`, "success");
      }
    } catch (err: any) {
      console.error("Failed to add calendar event:", err);
      addToast("Sync Failed", "Could not write to your cloud calendar.", "danger");
    }
  };

  // Add Goal & Habit Inline helpers
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetchWithAuth("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          target_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days away
          progress_percent: 0,
          category: newGoalCategory
        })
      });
      if (res.ok) {
        await fetchData();
        setNewGoalTitle("");
        addToast("Goal Created", `Successfully committed to "${newGoalTitle}".`, "success");
      }
    } catch (err) {
      console.error("Failed to add goal:", err);
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    try {
      const res = await fetchWithAuth("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newHabitTitle.trim(),
          frequency: newHabitFreq
        })
      });
      if (res.ok) {
        await fetchData();
        setNewHabitTitle("");
        addToast("Habit Formed", `Daily safeguard lock initialized for "${newHabitTitle}".`, "success");
      }
    } catch (err) {
      console.error("Failed to add habit:", err);
    }
  };

  const handleIncrementHabit = async (habitId: string) => {
    try {
      const res = await fetchWithAuth(`/api/habits/${habitId}`, {
        method: "PUT"
      });
      if (res.ok) {
        await fetchData();
        addToast("Streak Updated!", "Cognitive behavior habit locked in for today.", "success");
      }
    } catch (err) {
      console.error("Failed to increment habit:", err);
    }
  };

  // Utility to determine Task Urgency indicators
  const getTaskUrgencyStyle = (deadlineIso: string) => {
    const d = new Date(deadlineIso);
    const diffHours = (d.getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 0) return { label: "OVERDUE", text: "text-red-400 bg-red-950/40 border-red-500/20" };
    if (diffHours <= 3) return { label: "IMMEDIATE", text: "text-rose-400 bg-rose-950/40 border-rose-500/30 animate-pulse" };
    if (diffHours <= 12) return { label: "CRITICAL", text: "text-amber-400 bg-amber-950/40 border-amber-500/20" };
    if (diffHours <= 24) return { label: "TODAY", text: "text-amber-300/80 bg-slate-900/40 border-slate-700/30" };
    return { label: "PLANNED", text: "text-slate-400 bg-slate-900/40 border-slate-800/30" };
  };

  // Filter Tasks
  const filteredTasks = db.tasks.filter(t => {
    const matchesSearch = taskSearchQuery.trim() === "" || 
      t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(taskSearchQuery.toLowerCase())) ||
      t.category.toLowerCase().includes(taskSearchQuery.toLowerCase());
      
    const matchesCategory = taskCategoryFilter === "all" || t.category === taskCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const pendingTasks = filteredTasks.filter(t => t.status !== "done").sort((a, b) => {
    const orderA = a.custom_order !== undefined ? a.custom_order : (1000000 - a.priority_score);
    const orderB = b.custom_order !== undefined ? b.custom_order : (1000000 - b.priority_score);
    return orderA - orderB;
  });
  const completedTasks = filteredTasks.filter(t => t.status === "done").sort((a,b) => b.priority_score - a.priority_score);

  // Compute chart data for completed vs pending over the last 7 days
  const get7DayProductivityData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const label = d.toLocaleDateString([], { month: "short", day: "numeric" });
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      
      // Completed on this day
      const completedOnDay = db.tasks.filter(t => {
        if (t.status === "done" && t.completed_at) {
          const compDate = new Date(t.completed_at);
          return compDate >= d && compDate < nextDay;
        }
        return false;
      }).length;
      
      // Pending on this day (created before end of day, and not completed yet or completed after end of day)
      const pendingOnDay = db.tasks.filter(t => {
        const createdDate = new Date(t.created_at);
        if (createdDate >= nextDay) return false;
        
        if (t.status === "done" && t.completed_at) {
          const compDate = new Date(t.completed_at);
          return compDate >= nextDay;
        }
        return true;
      }).length;
      
      data.push({
        name: label,
        Completed: completedOnDay,
        Pending: pendingOnDay
      });
    }
    return data;
  };

  const chartData = get7DayProductivityData();

  const getTaskTrendData = (task: Task) => {
    const points = [];
    const hours = [-24, -18, -12, -6, 0];
    const now = new Date();
    
    for (const h of hours) {
      const virtualNow = new Date(now.getTime() + h * 60 * 60 * 1000);
      const deadline = new Date(task.deadline);
      const diffMs = deadline.getTime() - virtualNow.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let score = 0;
      // 1. Urgency score component
      if (diffHours <= 0) {
        score += 50;
      } else if (diffHours <= 3) {
        score += 48;
      } else if (diffHours <= 12) {
        score += 42;
      } else if (diffHours <= 24) {
        score += 35;
      } else if (diffHours <= 48) {
        score += 25;
      } else if (diffHours <= 120) {
        score += 15;
      } else {
        score += 5;
      }

      // 2. Category score component
      if (task.category === "interview" || task.category === "bill") {
        score += 30;
      } else if (task.category === "assignment") {
        score += 22;
      } else if (task.category === "meeting") {
        score += 15;
      } else {
        score += 8;
      }

      // 3. Effort / Energy component
      if (task.energy_level === "low" || task.estimated_minutes < 30) {
        score += 18;
      } else if (task.energy_level === "medium") {
        score += 12;
      } else {
        score += 6;
      }

      const baseScore = Math.min(100, Math.max(1, score));
      // Smooth gradient interpolation based on deadline proximity
      let interpolationOffset = 0;
      if (diffHours > 0) {
        interpolationOffset = Math.min(8, (24 / (diffHours + 2)) * 2);
      } else {
        interpolationOffset = 10;
      }

      const label = h === 0 ? "Now" : `${Math.abs(h)}h ago`;
      points.push({
        time: label,
        score: Math.min(100, Math.max(1, Math.round(baseScore + interpolationOffset)))
      });
    }
    return points;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-300 mb-1.5">{label}</p>
          {payload.map((item: any) => (
            <div key={item.name} className="flex items-center gap-2 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400">{item.name}:</span>
              <span className="text-white font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!token) {
    return (
      <div className="relative min-h-screen bg-[#070b13] text-white font-sans overflow-x-hidden flex items-center justify-center p-4">
        {/* MESH BLURRED BACKGROUND BLOBS */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute blob blob-1 top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full filter blur-[120px] animate-float-1" />
          <div className="absolute blob blob-2 bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-pink-500/15 rounded-full filter blur-[130px] animate-float-2" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Brand/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20 mb-4">
              <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              DeadlineGuardian
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Autonomous Cognitive Planning & Threat Mitigation Engine
            </p>
          </div>

          <div className="glass-dark rounded-2xl border border-white/10 shadow-2xl p-6 md:p-8 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex border-b border-white/5 mb-6">
              <button
                type="button"
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                    placeholder="e.g. adafocus"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <Settings className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{authMode === 'login' ? "Secure Sign In" : "Register Workspace"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070b13] text-white font-sans overflow-x-hidden">
      
      {/* 1. MESH BLURRED NEON BACKGROUND BLOBS - FROSTED GLASS THEME */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute blob blob-1 top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full filter blur-[120px] animate-float-1" />
        <div className="absolute blob blob-2 bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-pink-500/15 rounded-full filter blur-[130px] animate-float-2" />
        <div className="absolute blob blob-3 top-[25%] left-[30%] w-[450px] h-[450px] bg-cyan-500/15 rounded-full filter blur-[110px] animate-float-3" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
        
        {/* 2. HEADER BAR */}
        <header className="glass-dark rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 border border-white/10 shadow-2xl relative overflow-hidden group">
          {/* Subtle inside glowing light */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20">
              <ShieldAlert className="w-6 h-6 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#070b13] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  DeadlineGuardian
                </span>
                <span className="text-[10px] px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20 shadow-xs">
                  Pro v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Autonomous Cognitive Planning & Threat Mitigation Engine</p>
            </div>
          </div>

          {/* Quick Stats Ticker */}
          <div className="hidden lg:flex items-center gap-6 text-xs bg-slate-950/40 px-5 py-2.5 rounded-2xl border border-white/5 relative z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${pendingTasks.length > 3 ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)] animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`} />
              <span className="text-slate-400 font-medium">System State:</span>
              <span className={`font-bold tracking-wide uppercase ${pendingTasks.length > 4 ? 'text-rose-400' : pendingTasks.length > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {pendingTasks.length > 4 ? 'OVERCOMMITMENT' : pendingTasks.length > 2 ? 'ELEVATED THREAT' : 'SECURED'}
              </span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Safeguarded:</span>
              <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded-md font-mono">{pendingTasks.length} pending</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Averted Misses:</span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">+{completedTasks.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10">
            {/* Notification Permission status/toggle */}
            {typeof window !== 'undefined' && 'Notification' in window && (
              <button
                id="notification-permission-btn"
                onClick={requestNotificationPermission}
                title={notificationPermission === 'granted' ? "System notifications active" : "Enable system desktop notifications"}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                    : notificationPermission === 'denied'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20'
                }`}
              >
                {notificationPermission === 'granted' ? (
                  <>
                    <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    <span className="hidden md:inline">Alerts Active</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden md:inline">Enable Alerts</span>
                  </>
                )}
              </button>
            )}

            {/* Auto tick test action trigger */}
            <button
              id="autonomous-simulation-btn"
              onClick={handleTriggerAutonomousTick}
              disabled={runningAutonomousTick}
              title="Simulate scheduled background job to execute autonomous task corrections"
              className="flex items-center gap-2 text-xs bg-gradient-to-r from-pink-500/10 to-indigo-500/10 hover:from-pink-500/20 hover:to-indigo-500/20 text-pink-300 px-4 py-2.5 rounded-xl border border-pink-500/20 font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-pink-500/5 cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 ${runningAutonomousTick ? 'animate-spin' : ''}`} />
              <span>{runningAutonomousTick ? "Simulating..." : "Simulate Guardian Scan"}</span>
            </button>

            {/* Reset Defaults button */}
            <button
              id="reset-db-btn"
              onClick={handleResetData}
              title="Re-seed clean demo data"
              className="p-2.5 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/60 rounded-xl border border-white/5 transition-all hover:border-white/10 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* User Profile info and Logout */}
            {user && (
              <div className="flex items-center gap-2.5 bg-slate-900/50 hover:bg-slate-800/60 pl-3.5 pr-2.5 py-1.5 rounded-xl border border-white/5 transition-all">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-300">
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer hover:bg-rose-500/10 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 3. API NOTIFICATION WARNING IN CASE OF NO API KEY */}
        {!isGeminiConfigured && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4.5 mb-6 flex items-start gap-3.5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <span>Gemini Key Not Configured (Demonstration Sandbox Mode)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                We are running using high-fidelity fallback logs and rule-based calculations. 
                Configure your <strong className="text-amber-200 font-semibold">GEMINI_API_KEY</strong> environment variable to turn on live full-stack cognitive planning, voice speech transcription, real-time subtask split-ups, and pattern synthesis!
              </p>
            </div>
          </div>
        )}

        {/* 4. MAIN LAYOUT COLLABORATION PANEL CONTAINER */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT INTERACTIVE CONTROL SIDEBAR (TABS) */}
          <nav className="xl:col-span-2 flex xl:flex-col gap-1.5 overflow-x-auto pb-2 xl:pb-0">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Core Workspace</span>
            </button>
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'chat' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Bot className="w-4.5 h-4.5" />
              <div className="flex items-center gap-2">
                <span>Agent Chat</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_6px_rgba(99,102,241,1)]" />
              </div>
            </button>
            <button
              id="tab-calendar"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'calendar' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Focus Calendar</span>
            </button>
            <button
              id="tab-goals"
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'goals' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <Target className="w-4.5 h-4.5" />
              <span>Habits & Streaks</span>
            </button>
            <button
              id="tab-patterns"
              onClick={() => setActiveTab('patterns')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'patterns' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Cognitive Patterns</span>
            </button>
            <button
              id="tab-logs"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 text-left relative overflow-hidden cursor-pointer ${
                activeTab === 'logs' 
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
              }`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>Guardian Logs</span>
            </button>
          </nav>

          {/* 5. CENTER VIEW CONTROLLER */}
          <main className="xl:col-span-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* VIEW TAB 1: CORE WORKSPACE DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              >
                {/* LEFT BLOCK: CREATOR & ACTIVE TASKS */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Task Quick-Adder Panel */}
                  <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none transition-transform group-hover:scale-105 duration-500">
                      <Plus className="w-24 h-24 text-indigo-400" />
                    </div>
                    
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Commitment Entry Console</span>
                    </h2>

                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div>
                        <input
                          id="input-task-title"
                          type="text"
                          required
                          placeholder="What is your high-priority target assignment/bill?"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/80 transition-all text-white placeholder-slate-500 shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Category</label>
                          <select
                            id="select-task-category"
                            value={newTaskCategory}
                            onChange={(e) => setNewTaskCategory(e.target.value as Task['category'])}
                            className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/85 transition-all cursor-pointer font-medium"
                          >
                            <option value="assignment" className="bg-[#070b13] text-slate-300">📚 School Assignment</option>
                            <option value="bill" className="bg-[#070b13] text-slate-300">💳 Utility / Bill Payment</option>
                            <option value="meeting" className="bg-[#070b13] text-slate-300">📅 Sync / Meeting Prep</option>
                            <option value="interview" className="bg-[#070b13] text-slate-300">💼 Tech Interview Prep</option>
                            <option value="other" className="bg-[#070b13] text-slate-300">⚙️ General Commitment</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Energy Level / Focus Needed</label>
                          <select
                            id="select-task-energy"
                            value={newTaskEnergy}
                            onChange={(e) => setNewTaskEnergy(e.target.value as Task['energy_level'])}
                            className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/85 transition-all cursor-pointer font-medium"
                          >
                            <option value="low" className="bg-[#070b13] text-slate-300">🔋 Low Energy (Easy Win)</option>
                            <option value="medium" className="bg-[#070b13] text-slate-300">⚡ Medium Focus</option>
                            <option value="high" className="bg-[#070b13] text-slate-300">🔥 High Cognitive Focus</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Deadline Proximity</label>
                          <select
                            id="select-task-hours"
                            value={newTaskHoursOffset}
                            onChange={(e) => setNewTaskHoursOffset(e.target.value)}
                            className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/85 transition-all cursor-pointer font-medium"
                          >
                            <option value="0.25" className="bg-[#070b13] text-rose-300 font-bold">🚨 Due in 15 minutes (Trigger Test Alert!)</option>
                            <option value="0.4" className="bg-[#070b13] text-amber-300">⏳ Due in 24 minutes (Test Alert!)</option>
                            <option value="1.5" className="bg-[#070b13] text-slate-300">⏰ Due in 1.5 hours (Emergency!)</option>
                            <option value="3" className="bg-[#070b13] text-slate-300">⏳ Due in 3 hours</option>
                            <option value="6" className="bg-[#070b13] text-slate-300">⚠️ Due in 6 hours</option>
                            <option value="12" className="bg-[#070b13] text-slate-300">📅 Due Tomorrow morning (12h)</option>
                            <option value="24" className="bg-[#070b13] text-slate-300">🗓 Due Tomorrow night (24h)</option>
                            <option value="72" className="bg-[#070b13] text-slate-300">📆 Due in 3 days</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Estimated Build Time</label>
                          <select
                            id="select-task-est"
                            value={newTaskEstMins}
                            onChange={(e) => setNewTaskEstMins(e.target.value)}
                            className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/85 transition-all cursor-pointer font-medium"
                          >
                            <option value="15" className="bg-[#070b13] text-slate-300">⚡ 15 Minutes (Quick fix)</option>
                            <option value="30" className="bg-[#070b13] text-slate-300">⏰ 30 Minutes</option>
                            <option value="60" className="bg-[#070b13] text-slate-300">🕒 1 Hour</option>
                            <option value="120" className="bg-[#070b13] text-slate-300">⏱ 2 Hours</option>
                            <option value="240" className="bg-[#070b13] text-slate-300">💼 4 Hours (Large study block)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <textarea
                          id="input-task-desc"
                          rows={2}
                          placeholder="Optional notes or details (e.g. submit URL, Canvas portal info)..."
                          value={newTaskDesc}
                          onChange={(e) => setNewTaskDesc(e.target.value)}
                          className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/80 transition-all text-white placeholder-slate-500 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          id="add-task-submit"
                          type="submit"
                          disabled={isAddingTask}
                          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-semibold text-xs px-5 py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isAddingTask ? "Assessing Threat..." : "Anchor New Commitment"}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Priorities Guard List */}
                  <div className="space-y-4.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Active Deadline Threat Board
                        </h2>
                      </div>
                      <span className="text-[11px] px-3 py-1 bg-slate-950/60 text-slate-300 rounded-full border border-white/5 font-bold font-mono">
                        {pendingTasks.length} pending
                      </span>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/30 p-3 rounded-2xl border border-white/5 shadow-inner">
                      <div className="sm:col-span-2 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Search className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                          id="task-search-input"
                          type="text"
                          placeholder="Search commitments by title or details..."
                          value={taskSearchQuery}
                          onChange={(e) => setTaskSearchQuery(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/80 transition-all shadow-inner"
                        />
                        {taskSearchQuery && (
                          <button
                            id="clear-search-query-btn"
                            type="button"
                            onClick={() => setTaskSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="relative">
                        <select
                          id="task-category-filter-select"
                          value={taskCategoryFilter}
                          onChange={(e) => setTaskCategoryFilter(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/80 transition-all cursor-pointer font-medium"
                        >
                          <option value="all">📁 All Categories</option>
                          <option value="assignment">📚 Assignments</option>
                          <option value="bill">💳 Bills / Payments</option>
                          <option value="meeting">📅 Syncs / Meetings</option>
                          <option value="interview">💼 Tech Interviews</option>
                          <option value="other">⚙️ General</option>
                        </select>
                      </div>
                    </div>

                    {pendingTasks.length === 0 ? (
                      (taskSearchQuery.trim() !== "" || taskCategoryFilter !== "all") ? (
                        <div className="glass-dark rounded-2xl p-10 text-center border border-dashed border-white/10 shadow-xl relative overflow-hidden">
                          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
                          <h3 className="text-base font-semibold text-white">No Matching Targets Found</h3>
                          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                            Your active filter or keyword search didn't return any tasks. Clear the search bar or filter selection to see your commitments.
                          </p>
                          <button
                            id="clear-task-filters-btn"
                            type="button"
                            onClick={() => {
                              setTaskSearchQuery("");
                              setTaskCategoryFilter("all");
                            }}
                            className="mt-4 inline-flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            <X className="w-4 h-4" />
                            <span>Clear Search Filters</span>
                          </button>
                        </div>
                      ) : (
                        <div className="glass-dark rounded-2xl p-10 text-center border border-dashed border-white/10 shadow-xl relative overflow-hidden">
                          <CheckSquare className="w-12 h-12 text-emerald-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]" />
                          <h3 className="text-base font-semibold text-white">All Commitments Secured!</h3>
                          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                            No active deadline threat detected. Use the top entry form to anchor an upcoming submission or sync.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="space-y-4">
                        {pendingTasks.map((task) => {
                          const urgency = getTaskUrgencyStyle(task.deadline);
                          const completedSubtasks = task.subtasks.filter(s => s.completed).length;
                          const progressPct = task.subtasks.length > 0 ? Math.round((completedSubtasks / task.subtasks.length) * 100) : 0;

                          const isDragging = draggedTaskId === task.id;
                          const isDragOver = draggedOverTaskId === task.id;

                          return (
                            <div 
                              key={task.id} 
                              id={`task-item-${task.id}`}
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedTaskId(task.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDraggedTaskId(null);
                                setDraggedOverTaskId(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (task.id !== draggedTaskId && draggedOverTaskId !== task.id) {
                                  setDraggedOverTaskId(task.id);
                                }
                              }}
                              onDragLeave={() => {
                                if (draggedOverTaskId === task.id) {
                                  setDraggedOverTaskId(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropTask(task.id);
                              }}
                              className={`glass-dark rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group select-none ${
                                isDragging 
                                  ? "opacity-25 border-dashed border-indigo-500/40 bg-slate-950/50 scale-[0.97] pointer-events-none" 
                                  : isDragOver 
                                    ? "border-indigo-400 bg-indigo-500/10 scale-[1.01] shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20" 
                                    : "border-white/10 hover:border-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.06)] cursor-grab active:cursor-grabbing"
                              }`}
                            >
                              {/* Urgency side indicator */}
                              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                                task.priority_score >= 80 ? "bg-rose-500" : task.priority_score >= 50 ? "bg-amber-400" : "bg-indigo-500"
                              }`} />

                              <div className="flex items-start gap-4">
                                <div 
                                  className="flex items-center gap-1 mt-1 shrink-0"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing" />
                                  <button
                                    id={`complete-task-${task.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateTaskStatus(task.id, 'done');
                                    }}
                                    className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-700 bg-slate-950/40 hover:border-indigo-400 text-transparent hover:text-indigo-400 transition-all active:scale-90 cursor-pointer"
                                  >
                                    <CheckCircle className="w-4.5 h-4.5" />
                                  </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold border ${urgency.text}`}>
                                      {urgency.label}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 bg-slate-800/60 text-slate-300 rounded-md border border-white/5 font-semibold">
                                      {task.category.toUpperCase()}
                                    </span>
                                    
                                    {/* Calculated score indicator and visual sparkline */}
                                    <div className="ml-auto flex items-center gap-3">
                                      <div className="w-16 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" title="Priority Trend (24h)">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={getTaskTrendData(task)} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                                            <defs>
                                              <linearGradient id={`colorTrend-${task.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={
                                                  task.priority_score >= 80 ? "#ef4444" : task.priority_score >= 50 ? "#f59e0b" : "#6366f1"
                                                } stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor={
                                                  task.priority_score >= 80 ? "#ef4444" : task.priority_score >= 50 ? "#f59e0b" : "#6366f1"
                                                } stopOpacity={0}/>
                                              </linearGradient>
                                            </defs>
                                            <Area 
                                              type="monotone" 
                                              dataKey="score" 
                                              stroke={task.priority_score >= 80 ? "#ef4444" : task.priority_score >= 50 ? "#f59e0b" : "#6366f1"} 
                                              strokeWidth={1.5}
                                              fillOpacity={1}
                                              fill={`url(#colorTrend-${task.id})`} 
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <span 
                                        className="text-[11px] px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                                        title="Weighted threat priority calculation"
                                      >
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Priority: {Math.round(task.priority_score)}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <h3 className="text-base font-semibold text-white leading-snug group-hover:text-indigo-200 transition-colors">{task.title}</h3>
                                  {task.description && (
                                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{task.description}</p>
                                  )}

                                  {/* AI breakdown steps progress indicator */}
                                  {task.subtasks.length > 0 ? (
                                    <div className="mt-4 space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>Breakdown Progress</span>
                                        <span className="font-mono text-slate-300">{completedSubtasks}/{task.subtasks.length} steps</span>
                                      </div>
                                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3.5 flex items-center gap-2">
                                      <button
                                        id={`breakdown-btn-${task.id}`}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTriggerSubtaskGen(task.id);
                                        }}
                                        disabled={generatingSubtasksId === task.id}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                      >
                                        <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                                        <span>{generatingSubtasksId === task.id ? "Analyzing workload..." : "Auto-split into 3 Action Steps"}</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Task Interactive Checklist render */}
                                  {task.subtasks.length > 0 && (
                                    <div 
                                      className="mt-3.5 space-y-2 pl-1 border-l border-white/5"
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      {task.subtasks.map(sub => (
                                        <label 
                                          key={sub.id} 
                                          className="flex items-center gap-3 text-xs text-slate-300 hover:text-white cursor-pointer select-none py-1 transition-colors"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={sub.completed}
                                            onChange={() => {
                                              const updated = task.subtasks.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                                              handleUpdateSubtasks(task.id, updated);
                                            }}
                                            className="w-4 h-4 rounded-sm border-white/15 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                          />
                                          <span className={sub.completed ? "line-through text-slate-500 font-medium" : "font-medium"}>{sub.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}

                                  {/* Smart explanation note */}
                                  {task.priority_reason && (
                                    <p className="mt-4 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-start gap-2">
                                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                      <span>{task.priority_reason}</span>
                                    </p>
                                  )}
                                </div>

                                <button
                                  id={`delete-task-${task.id}`}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-all active:scale-95 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Secured tasks collapse section */}
                  {completedTasks.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Averted Overdue Disasters ({completedTasks.length})</span>
                      </h3>
                      <div className="space-y-3 opacity-70 hover:opacity-100 transition-opacity duration-300">
                        {completedTasks.map((task) => (
                          <div 
                            key={task.id}
                            className="glass-dark rounded-xl p-4 border border-white/5 hover:border-emerald-500/20 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                                className="text-emerald-400 hover:text-slate-400 transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-5 h-5 fill-emerald-500/10 text-emerald-400" />
                              </button>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-400 line-through leading-none">{task.title}</h4>
                                <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Secured safely on {new Date(task.completed_at || '').toLocaleDateString()}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* RIGHT BLOCK: CALENDAR SYNC & AUTONOMOUS ACTION TRAIL */}
                <div className="lg:col-span-5 space-y-6">

                  {/* Pomodoro Focus Timer */}
                  <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Pomodoro Focus Engine
                        </h2>
                      </div>
                      {pomoIsActive ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Focusing active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-950 text-slate-400 border border-white/5 uppercase rounded-full font-mono">
                          Paused
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Dedicate a high-intensity 25-minute sprint to block out distractions and maintain mental alignment.
                    </p>

                    {/* Task Selector */}
                    <div className="mb-4 space-y-1.5">
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Target Focus Assignment
                      </label>
                      {pendingTasks.length === 0 ? (
                        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>No active pending tasks. Add one to start focusing!</span>
                        </div>
                      ) : (
                        <select
                          id="pomo-task-selector"
                          value={pomoTaskId}
                          onChange={(e) => {
                            setPomoTaskId(e.target.value);
                            if (!pomoIsActive && pomoSessionType === 'work') {
                              setPomoSecondsRemaining(1500); // reset timer for new task
                            }
                          }}
                          className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500 transition-all font-medium"
                        >
                          {pendingTasks.map((task) => (
                            <option key={task.id} value={task.id} className="bg-[#070b13] text-slate-300">
                              [{task.priority_score} pts] {task.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Timer Circle/Progress Display */}
                    <div className="bg-slate-950/40 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center space-y-4 relative">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 mb-1.5 font-mono">
                          {pomoSessionType === 'work' ? "Focus Session" : "Rest & Recover"}
                        </span>
                        <div className="font-mono text-5xl font-extrabold tracking-widest text-indigo-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                          {Math.floor(pomoSecondsRemaining / 60).toString().padStart(2, '0')}
                          <span className="animate-pulse">:</span>
                          {(pomoSecondsRemaining % 60).toString().padStart(2, '0')}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            pomoSessionType === 'work' 
                              ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          }`}
                          style={{ width: `${(pomoSecondsRemaining / (pomoSessionType === 'work' ? 1500 : 300)) * 100}%` }}
                        />
                      </div>

                      {/* Control Panel */}
                      <div className="flex items-center gap-2.5 w-full">
                        <button
                          id="pomo-play-pause-btn"
                          onClick={() => setPomoIsActive(!pomoIsActive)}
                          disabled={pendingTasks.length === 0 && pomoSessionType === 'work'}
                          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${
                            pomoIsActive 
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950" 
                              : "bg-indigo-500 hover:bg-indigo-600 text-white"
                          }`}
                        >
                          {pomoIsActive ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Pause Focus</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Start Focus</span>
                            </>
                          )}
                        </button>

                        <button
                          id="pomo-reset-btn"
                          onClick={() => {
                            setPomoIsActive(false);
                            setPomoSecondsRemaining(pomoSessionType === 'work' ? 1500 : 300);
                          }}
                          className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-white/5 transition-all active:scale-95 cursor-pointer"
                          title="Reset current session timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Presets and Sessions count */}
                      <div className="flex items-center justify-between w-full pt-2.5 border-t border-white/5 text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <button
                            id="pomo-preset-work"
                            onClick={() => {
                              setPomoIsActive(false);
                              setPomoSessionType('work');
                              setPomoSecondsRemaining(1500);
                            }}
                            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                              pomoSessionType === 'work' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-white/5'
                            }`}
                          >
                            Work (25m)
                          </button>
                          <button
                            id="pomo-preset-break"
                            onClick={() => {
                              setPomoIsActive(false);
                              setPomoSessionType('break');
                              setPomoSecondsRemaining(300);
                            }}
                            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                              pomoSessionType === 'break' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'hover:bg-white/5'
                            }`}
                          >
                            Break (5m)
                          </button>
                        </div>

                        <div className="flex items-center gap-1 font-mono">
                          <span className="font-semibold text-slate-300">{pomoCompletedCount}</span>
                          <span>completed</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Productivity Trend Chart */}
                  <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          7-Day Productivity Trend
                        </h2>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 bg-slate-950 text-slate-400 rounded-full border border-white/5 font-bold uppercase tracking-wider">
                        completed vs pending
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Visual snapshot tracking completed achievements versus active overdue risks.
                    </p>

                    <div className="h-[200px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.03)" }} />
                          <Bar dataKey="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                          <Bar dataKey="Pending" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-white/5 text-[11px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#6366f1]" />
                        <span>Completed Tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#ec4899]" />
                        <span>Pending Backlog</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Today's AI Suggested Schedule Card */}
                  <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Today's Focused Slots
                        </h2>
                      </div>
                      <button
                        id="auto-plan-btn"
                        onClick={handleAutoPlanDay}
                        disabled={autoPlanning || pendingTasks.length === 0}
                        className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-500/10"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{autoPlanning ? "Arranging..." : "Auto-Plan My Day"}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Organizes priority blocks dynamically around your synchronized calendar conflicts.
                    </p>

                    <div className="space-y-3">
                      {db.schedule_blocks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-5 bg-slate-950/25 border border-dashed border-white/5 rounded-xl">
                          No focus slots scheduled. Tap "Auto-Plan My Day" to generate block suggestions.
                        </p>
                      ) : (
                        db.schedule_blocks.map(block => {
                          const start = new Date(block.start_time);
                          const end = new Date(block.end_time);
                          return (
                            <div 
                              key={block.id} 
                              className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                                block.source === 'calendar_synced' 
                                  ? 'bg-slate-900/40 border-white/5' 
                                  : 'bg-indigo-500/5 border-indigo-500/20'
                              }`}
                            >
                              <div className="mt-0.5">
                                <Clock className={`w-4 h-4 ${block.source === 'calendar_synced' ? 'text-slate-400' : 'text-indigo-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-white truncate">{block.title}</h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
                                  <span className="font-mono text-slate-300">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>-</span>
                                  <span className="font-mono text-slate-300">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="uppercase tracking-widest text-[9px] font-bold text-indigo-300">{block.source === 'calendar_synced' ? 'external' : 'AI planned'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      id="sync-external-calendar-btn"
                      onClick={handleAddCalendarEvent}
                      className="w-full mt-3.5 flex items-center justify-center gap-1.5 text-xs bg-slate-950/45 hover:bg-slate-900/45 text-slate-300 py-3 rounded-xl border border-white/5 hover:border-white/10 transition-all text-center cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Sync Newly Found External Calendar Meeting</span>
                    </button>
                  </div>

                  {/* Autonomous Activity Feed (Wow factor) */}
                  <div className="glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none transition-transform group-hover:scale-105 duration-500">
                      <Activity className="w-20 h-20 text-pink-400" />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-pink-400" />
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Autonomous Agent Log Feed
                        </h2>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold uppercase tracking-widest rounded-md animate-pulse">
                        Monitoring Active
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Real-time log trace of the background AI scanning engine as it auto-corrects threats, refactors subtasks, and updates score priorities.
                    </p>

                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                      {db.autonomous_logs.map(log => {
                        const iconType = log.action_type === 'reschedule' ? <Clock className="w-4 h-4 text-sky-400" /> : 
                                         log.action_type === 'task_split' ? <Sparkles className="w-4 h-4 text-indigo-400" /> :
                                         log.action_type === 'pattern_learned' ? <BookOpen className="w-4 h-4 text-pink-400" /> :
                                         <AlertTriangle className="w-4 h-4 text-amber-400" />;
                        return (
                          <div key={log.id} className="p-3.5 bg-slate-950/30 rounded-xl border border-white/5 hover:border-white/10 transition-all space-y-1.5">
                            <div className="flex items-center gap-2">
                              {iconType}
                              <h4 className="text-xs font-semibold text-white">{log.title}</h4>
                              <span className="ml-auto text-[9px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-slate-400 pl-6 leading-relaxed">{log.description}</p>
                            {log.details && (
                              <p className="text-[10px] text-slate-500 italic pl-6 font-mono">{log.details}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* VIEW TAB 2: AGENT INTELLIGENT CHAT */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 glass-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[580px] lg:min-h-[640px]"
              >
                
                {/* Chat Top header bar */}
                <div className="p-5 bg-slate-950/45 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative shadow-inner">
                      <Bot className="w-6 h-6 text-indigo-400" />
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#070b13] animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-widest">Ask your Proactive Guardian Agent</h2>
                      <p className="text-xs text-slate-400 mt-1">Instruct DeadlineGuardian to auto-arrange slots, break tasks down, or ask what you should focus on right now.</p>
                    </div>
                  </div>

                  {/* Speech Audio Toggles */}
                  <div className="flex items-center gap-2">
                    <button
                      id="speech-toggle-readaloud"
                      onClick={() => {
                        setReadAloud(!readAloud);
                        if (readAloud) window.speechSynthesis.cancel();
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${readAloud ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-white/5 hover:bg-slate-900/60'}`}
                      title={readAloud ? "Mute Read Aloud voice" : "Enable Text-to-Speech Read Aloud"}
                    >
                      {readAloud ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[460px] custom-scrollbar">
                  {db.conversations.map((msg) => {
                    const isUser = msg.role === 'user';
                    const isSystem = msg.role === 'system';
                    if (isSystem) return null; // Hide system warnings

                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl p-4.5 border text-xs leading-relaxed ${
                          isUser 
                            ? 'bg-indigo-500/10 text-indigo-100 border-indigo-500/20 shadow-sm shadow-indigo-500/5' 
                            : 'bg-slate-950/45 text-slate-200 border-white/5'
                        }`}>
                          <div className="flex items-center gap-2.5 mb-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <span>{isUser ? 'You' : 'Guardian Companion'}</span>
                            <span>•</span>
                            <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>

                          {/* Render automated actions taken badges underneath */}
                          {msg.actions_taken && msg.actions_taken.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                              {msg.actions_taken.map((act, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-indigo-300 font-semibold bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/10">
                                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                                  <span>{act.detail}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-950/45 text-slate-400 border border-white/5 rounded-2xl p-4.5 text-xs flex items-center gap-2.5">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span className="font-medium">DeadlineGuardian is analyzing workload priorities...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Microphone / Text Input Controls */}
                <form onSubmit={handleSendChatMessage} className="p-4 bg-slate-950/45 border-t border-white/10 flex items-center gap-3">
                  {speechSupported && (
                    <button
                      id="mic-recording-btn"
                      type="button"
                      onClick={toggleRecording}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${recording ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-slate-900'}`}
                      title={recording ? "Stop dictating voice input" : "Speak voice command dictation"}
                    >
                      {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}

                  <input
                    id="input-chat-message"
                    type="text"
                    required
                    placeholder={recording ? "Listening carefully..." : "Type task operations (e.g., 'Break project down' or 'Auto plan tomorrow')..."}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-xs focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/80 transition-all text-white placeholder-slate-500"
                  />

                  <button
                    id="send-chat-btn"
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>

              </motion.div>
            )}

            {/* VIEW TAB 3: FOCUS CALENDAR VIEW */}
            {activeTab === 'calendar' && (
              <motion.div
                key="calendar-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      <span>Visual Proactive Calendar Workspace</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Check today's merged timeline blending external synced calendars and autonomous focus work sessions.</p>
                  </div>
                  
                  <button
                    onClick={handleAddCalendarEvent}
                    className="flex items-center gap-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Sync Mock External Meeting</span>
                  </button>
                </div>

                {/* Calendar Timeline Layout representation */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20">
                  <div className="grid grid-cols-2 bg-slate-950/45 p-4 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>Hour Slot</span>
                    <span>Activity Content & Guardian Guard Type</span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {[
                      { hour: "08:00 AM", item: null },
                      { hour: "09:30 AM", item: { title: "Practice React System Design algorithms", type: "AI Suggested focus slot", color: "indigo" } },
                      { hour: "11:00 AM", item: null },
                      { hour: "01:30 PM", item: { title: "Team Sync Meeting", type: "Calendar Synced Slot", color: "slate" } },
                      { hour: "03:00 PM", item: null },
                      { hour: "06:00 PM", item: { title: "Submit CS101 final codes repo", type: "Task Submission Target", color: "rose" } },
                      { hour: "08:00 PM", item: null },
                    ].map((slot, i) => (
                      <div key={i} className="grid grid-cols-2 p-4.5 text-xs items-center hover:bg-white/[0.01] transition-colors">
                        <span className="font-mono text-slate-400 font-bold">{slot.hour}</span>
                        {slot.item ? (
                          <div className={`p-4 rounded-xl border max-w-sm shadow-sm ${
                            slot.item.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300' :
                            slot.item.color === 'rose' ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' :
                            'bg-slate-900 border-white/5 text-slate-300'
                          }`}>
                            <h4 className="font-semibold text-xs text-white leading-normal">{slot.item.title}</h4>
                            <p className="text-[9px] text-slate-400/80 mt-1.5 uppercase tracking-widest font-extrabold">{slot.item.type}</p>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Available focus buffer slot</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Synced events feed */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synced Calendars Linked Events</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {db.calendar_events.map(ev => {
                      const start = new Date(ev.start_time);
                      return (
                        <div key={ev.id} className="p-4 bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-white truncate">{ev.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Starting on {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className="text-[9px] px-2.5 py-1 bg-slate-950 text-slate-400 rounded-md border border-white/5 font-bold uppercase tracking-widest">SYNCED</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </motion.div>
            )}

            {/* VIEW TAB 4: HABITS & STREAKS TARGETS */}
            {activeTab === 'goals' && (
              <motion.div
                key="goals-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6"
              >
                
                {/* Header title */}
                <div>
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                    <Target className="w-5 h-5 text-indigo-400" />
                    <span>Habits & Progression Streaks</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Establish milestones and daily algorithms habits to maintain consistent productivity scores.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Habits Streak card */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure Focus Habits</h3>
                    
                    <form onSubmit={handleAddHabit} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g., Practice LeetCode algorithms"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        className="flex-1 bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs focus:outline-hidden focus:border-indigo-500/50 transition-all text-white placeholder-slate-500"
                      />
                      <select
                        value={newHabitFreq}
                        onChange={(e) => setNewHabitFreq(e.target.value as 'daily' | 'weekly')}
                        className="bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden font-medium cursor-pointer"
                      >
                        <option value="daily" className="bg-[#070b13]">Daily</option>
                        <option value="weekly" className="bg-[#070b13]">Weekly</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4.5 py-3 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-500/10"
                      >
                        Add
                      </button>
                    </form>

                    <div className="space-y-3">
                      {db.habits.map(h => (
                        <div key={h.id} className="p-4 bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-white">{h.title}</h4>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 font-bold">{h.frequency} streak</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 font-mono">
                              🔥 {h.streak_count} days
                            </span>
                            <button
                              onClick={() => handleIncrementHabit(h.id)}
                              className="text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-all cursor-pointer"
                            >
                              + Completed
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Milestones Card */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Linked Career & Life Goals</h3>

                    <form onSubmit={handleAddGoal} className="space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g., Secure Frontend Internship"
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        className="w-full bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs focus:outline-hidden focus:border-indigo-500/50 transition-all text-white placeholder-slate-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newGoalCategory}
                          onChange={(e) => setNewGoalCategory(e.target.value)}
                          className="flex-1 bg-slate-950/45 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-slate-300 focus:outline-hidden font-medium cursor-pointer"
                        >
                          <option value="career" className="bg-[#070b13]">💼 Career Goals</option>
                          <option value="health" className="bg-[#070b13]">🍏 Health Goals</option>
                          <option value="financial" className="bg-[#070b13]">💰 Financial Goals</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4.5 py-3 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-500/10"
                        >
                          Establish
                        </button>
                      </div>
                    </form>

                    <div className="space-y-3">
                      {db.goals.map(g => (
                        <div key={g.id} className="p-4 bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all rounded-xl space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-white">{g.title}</span>
                            <span className="text-[9px] px-2.5 py-1 bg-slate-950 text-slate-400 rounded-md uppercase border border-white/5 font-extrabold tracking-widest">{g.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${g.progress_percent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-indigo-300 font-mono">{g.progress_percent}% complete</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* VIEW TAB 5: PATTERNS & PERSONALIZED DIAGNOSTICS */}
            {activeTab === 'patterns' && (
              <motion.div
                key="patterns-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6"
              >
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <span>Cognitive Patterns & Behavior Diagnostics</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Discovered estimations gaps and productive peak hour insights synthesized automatically.</p>
                  </div>
                  
                  <button
                    id="analyze-patterns-btn"
                    onClick={handleTriggerPatternAnalysis}
                    disabled={analyzingPatterns}
                    className="flex items-center gap-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4.5 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-55 cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{analyzingPatterns ? "Analyzing patterns..." : "Synthesize My Rhythms"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {db.patterns.map(p => (
                    <div key={p.id} className="p-5 bg-indigo-500/5 border border-indigo-500/15 hover:border-indigo-500/30 transition-all rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none transition-transform group-hover:scale-105 duration-500">
                        <TrendingUp className="w-20 h-20 text-indigo-400" />
                      </div>

                      <div className="flex items-center gap-2 mb-3.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        <Zap className="w-4 h-4 text-indigo-400" />
                        <span>{p.pattern_type.replace('_', ' ')}</span>
                      </div>

                      <h4 className="text-xs font-extrabold text-white mb-2 uppercase tracking-wide">{p.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.description}</p>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-white/5 font-mono">
                        <span>Confidence: <span className="text-indigo-400 font-semibold">{Math.round(p.confidence * 100)}%</span></span>
                        <span>Updated {new Date(p.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}

            {/* VIEW TAB 6: FULL SECURED ARCHIVE OF AUTONOMOUS LOGS */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:col-span-12 glass-dark rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>Guardian Activity Logs Archive</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Full persistent audit history of autonomous background tasks split, priorities adjusted, and schedule re-balanced events.</p>
                </div>

                <div className="space-y-3">
                  {db.autonomous_logs.map(log => (
                    <div key={log.id} className="p-4 bg-slate-950/45 border border-white/5 hover:border-white/10 transition-all rounded-xl space-y-2 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[9px] px-2.5 py-0.5 bg-slate-900 text-slate-400 font-bold uppercase tracking-widest rounded-md border border-white/5">
                            {log.action_type}
                          </span>
                          <span className="text-xs font-bold text-white leading-none">{log.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2.5 pl-1 leading-relaxed">{log.description}</p>
                        {log.details && (
                          <p className="text-[10px] text-indigo-300 mt-1.5 pl-1 font-mono">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}

          </main>

        </div>

        {/* 6. BOTTOM DESIGN CREDIT */}
        <footer className="mt-12 mb-4 pt-6 border-t border-white/5 text-center text-xs text-slate-500 leading-normal">
          <p>© 2026 Designed with ❤️ by Bhavya Gupta</p>
        </footer>

      </div>

      {/* Floating custom in-app Toast Notifications Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3.5 relative overflow-hidden ${
                toast.type === 'danger'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200 shadow-rose-950/40'
                  : toast.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 shadow-emerald-950/40'
                    : toast.type === 'warning'
                      ? 'bg-amber-950/80 border-amber-500/40 text-amber-200 shadow-amber-950/40'
                      : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200 shadow-indigo-950/40'
              }`}
            >
              {/* Visual alert status indicator side border */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                toast.type === 'danger' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
              }`} />

              {/* Toast Icon */}
              <div className="shrink-0 mt-0.5">
                {toast.type === 'danger' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : toast.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <Info className="w-5 h-5 text-indigo-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h5 className="font-bold text-xs uppercase tracking-wide text-white">{toast.title}</h5>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{toast.description}</p>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all active:scale-90 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
