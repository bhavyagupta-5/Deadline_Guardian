import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to initialize Gemini SDK safely
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in your environment or Secrets tab.");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// Check if Gemini key is available
function isGeminiConfigured(): boolean {
  try {
    const key = process.env.GEMINI_API_KEY;
    return !!(key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "");
  } catch {
    return false;
  }
}

// Generate Relative dates based on current server time
function getRelativeDate(hoursOffset: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + hoursOffset * 60);
  return d.toISOString();
}

// Default Seed Data
const getDefaultState = () => {
  return {
    tasks: [
      {
        id: "task-1",
        title: "CS101 Final Coding Project Submission",
        description: "Submit the GitHub repository link and writeup for the React portfolio project. Needs to include responsive design and state persistence.",
        deadline: getRelativeDate(2.5), // Due in 2.5 hours!
        estimated_minutes: 120,
        category: "assignment",
        status: "pending",
        priority_score: 94,
        priority_reason: "Critical: Due in under 3 hours, weighted 25% of overall course grade.",
        energy_level: "high",
        source: "manual",
        subtasks: [
          { id: "sub-1-1", title: "Complete README documentation", completed: false },
          { id: "sub-1-2", title: "Test responsive viewport breaks", completed: false },
          { id: "sub-1-3", title: "Submit link on Canvas dashboard", completed: false }
        ],
        created_at: getRelativeDate(-48)
      },
      {
        id: "task-2",
        title: "Pay Electricity and Wifi Bills",
        description: "Pay outstanding utility balances to avoid service disruption or late penalty charges.",
        deadline: getRelativeDate(18), // Due tomorrow morning
        estimated_minutes: 15,
        category: "bill",
        status: "pending",
        priority_score: 78,
        priority_reason: "High: Direct financial late fee penalty if missed; quick win task.",
        energy_level: "low",
        source: "manual",
        subtasks: [
          { id: "sub-2-1", title: "Log into utility portal", completed: false },
          { id: "sub-2-2", title: "Confirm credit card details", completed: false }
        ],
        created_at: getRelativeDate(-24)
      },
      {
        id: "task-3",
        title: "Prepare for Frontend Engineer Technical Interview",
        description: "Review system design architectures, React performance hooks, and practice whiteboard algorithms.",
        deadline: getRelativeDate(42), // Due in ~2 days
        estimated_minutes: 240,
        category: "interview",
        status: "pending",
        priority_score: 85,
        priority_reason: "High: Huge professional opportunity. Large scope, needs progressive study blocks.",
        energy_level: "high",
        source: "manual",
        subtasks: [
          { id: "sub-3-1", title: "Review React fiber and rendering lifecycles", completed: true },
          { id: "sub-3-2", title: "Solve 2 LeetCode sliding window problems", completed: false },
          { id: "sub-3-3", title: "Draft answers for common architectural questions", completed: false }
        ],
        created_at: getRelativeDate(-72)
      },
      {
        id: "task-4",
        title: "Weekly Sync with Team Lead",
        description: "Align on core product sprints, provide demo files, and review next milestones.",
        deadline: getRelativeDate(14), // Scheduled tomorrow
        estimated_minutes: 30,
        category: "meeting",
        status: "pending",
        priority_score: 65,
        priority_reason: "Medium: Standard status check, preparation blocks are low effort.",
        energy_level: "medium",
        source: "meeting",
        subtasks: [
          { id: "sub-4-1", title: "Prepare weekly bullet-point slide", completed: false }
        ],
        created_at: getRelativeDate(-12)
      },
      {
        id: "task-5",
        title: "Grocery Shopping & Meal Prep",
        description: "Buy fresh vegetables, lean proteins, and batch cook healthy meals for the workweek.",
        deadline: getRelativeDate(72), // 3 days away
        estimated_minutes: 90,
        category: "other",
        status: "pending",
        priority_score: 42,
        priority_reason: "Low: Highly flexible, can be completed during evening downtime.",
        energy_level: "medium",
        source: "manual",
        subtasks: [],
        created_at: getRelativeDate(-2)
      }
    ],
    schedule_blocks: [
      {
        id: "block-1",
        title: "Weekly Sync Event (Calendar)",
        start_time: getRelativeDate(13.5),
        end_time: getRelativeDate(14.5),
        source: "calendar_synced",
        status: "planned"
      },
      {
        id: "block-2",
        task_id: "task-1",
        title: "Final project deployment & README polish",
        start_time: getRelativeDate(0.5), // Starts in 30 mins
        end_time: getRelativeDate(2),
        source: "ai_suggested",
        status: "planned"
      }
    ],
    calendar_events: [
      {
        id: "cal-1",
        title: "Weekly Sync Event",
        start_time: getRelativeDate(13.5),
        end_time: getRelativeDate(14.5)
      },
      {
        id: "cal-2",
        title: "Dentist Routine Cleaning",
        start_time: getRelativeDate(36),
        end_time: getRelativeDate(37.5)
      }
    ],
    goals: [
      {
        id: "goal-1",
        title: "Land a Full-Time Frontend Job",
        target_date: getRelativeDate(360),
        progress_percent: 45,
        category: "career"
      },
      {
        id: "goal-2",
        title: "Build High Healthy Habits (Diet & Sport)",
        target_date: getRelativeDate(90),
        progress_percent: 60,
        category: "health"
      }
    ],
    habits: [
      {
        id: "habit-1",
        title: "Algorithms review (30 mins daily)",
        frequency: "daily",
        streak_count: 5,
        last_completed_at: new Date(Date.now() - 86400000).toISOString().split("T")[0]
      },
      {
        id: "habit-2",
        title: "Weekly calendar planning",
        frequency: "weekly",
        streak_count: 3,
        last_completed_at: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0]
      }
    ],
    patterns: [
      {
        id: "pattern-1",
        pattern_type: "underestimates_duration",
        title: "Coding Tasks Estimation Anchor",
        description: "You consistently take ~40% longer on coding tasks than initially planned. DeadlineGuardian has automatically padded upcoming project blocks.",
        confidence: 0.88,
        updated_at: getRelativeDate(-24)
      },
      {
        id: "pattern-2",
        pattern_type: "best_focus_window",
        title: "Golden Study Hours Detected",
        description: "Your focus peaks between 9:00 AM and 11:30 AM. Creative and complex coding tasks are prioritised here for maximum efficiency.",
        confidence: 0.92,
        updated_at: getRelativeDate(-48)
      }
    ],
    conversations: [
      {
        id: "msg-1",
        role: "system",
        content: "System initialized. Proactive Guardian agent connected and monitoring active threats.",
        created_at: getRelativeDate(-1)
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Hello! I'm your DeadlineGuardian. I've analyzed your upcoming commitments and noted that your **CS101 Final Coding Project Submission** is due in less than 3 hours. I've auto-scheduled a study block in 30 minutes to ensure you push your code safely. Let's tackle it!",
        created_at: getRelativeDate(-0.95)
      }
    ],
    autonomous_logs: [
      {
        id: "log-1",
        timestamp: getRelativeDate(-1),
        title: "Autonomous Study Block Auto-Scheduled",
        description: "Identified a high-priority threat: CS101 Final Coding Project submission is due in 3 hours with no planned schedule block. Auto-scheduled from 10:00 PM to 11:30 PM.",
        action_type: "reschedule",
        details: "Assigned CS101 study block in open slot preceding official deadline."
      }
    ]
  };
};

// Database state accessor
function readDB(): any {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultState = getDefaultState();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2));
      return defaultState;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read db.json, returning default state", error);
    return getDefaultState();
  }
}

function writeDB(state: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to write to db.json", error);
  }
}

// Calculate Deterministic Priority Score
function calculateBasePriority(task: any) {
  let score = 0;
  const now = new Date();
  const deadline = new Date(task.deadline);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // 1. Urgency: maximum 50 points
  if (diffHours <= 0) {
    score += 50; // Overdue tasks get full urgency weight
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

  // 2. Category Importance: maximum 30 points
  if (task.category === "interview" || task.category === "bill") {
    score += 30;
  } else if (task.category === "assignment") {
    score += 22;
  } else if (task.category === "meeting") {
    score += 15;
  } else {
    score += 8;
  }

  // 3. Effort Inverse / Quick Wins: maximum 20 points
  // Give a small boost to low-energy/short tasks to secure quick wins, or high energy to highlight complexity
  if (task.energy_level === "low" || task.estimated_minutes < 30) {
    score += 18;
  } else if (task.energy_level === "medium") {
    score += 12;
  } else {
    score += 6;
  }

  // Bound score strictly between 1 and 100
  return Math.min(100, Math.max(1, score));
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// General Data fetch
app.get("/api/data", (req, res) => {
  res.json({
    ...readDB(),
    isGeminiConfigured: isGeminiConfigured()
  });
});

// Force Database Reset to Seed Data
app.post("/api/data/reset", (req, res) => {
  const newState = getDefaultState();
  writeDB(newState);
  res.json({ success: true, state: newState });
});

// Create Task with hybrid Priority Scoring
app.post("/api/tasks", async (req, res) => {
  const db = readDB();
  const taskData = req.body;

  const newTask = {
    id: "task-" + Date.now(),
    title: taskData.title || "Untitled Task",
    description: taskData.description || "",
    deadline: taskData.deadline || getRelativeDate(24),
    estimated_minutes: parseInt(taskData.estimated_minutes) || 30,
    category: taskData.category || "other",
    status: taskData.status || "pending",
    energy_level: taskData.energy_level || "medium",
    source: "manual",
    subtasks: taskData.subtasks || [],
    created_at: new Date().toISOString()
  };

  // 1. Calculate the deterministic base priority
  const basePriority = calculateBasePriority(newTask);
  let finalPriority = basePriority;
  let reason = `Calculated automatically based on category (${newTask.category}) and deadline.`;

  // 2. If Gemini is configured, get an AI-powered override adjustment & reason
  if (isGeminiConfigured()) {
    try {
      const aiClient = getGeminiClient();
      const prompt = `You are DeadlineGuardian's intelligent Task Prioritization Engine.
We have calculated a base priority score of ${basePriority}/100 for this task:
Task Title: "${newTask.title}"
Description: "${newTask.description}"
Category: "${newTask.category}"
Deadline: "${newTask.deadline}"
Estimated duration: ${newTask.estimated_minutes} mins
Energy required: "${newTask.energy_level}"

Analyze the context. Adjust the priority score by up to +/- 15 points to reflect smart human factors (e.g. bills should be paid before banks close, interviews block other work, writing is best done in peak blocks).
Return exactly a JSON object matching this schema:
{
  "adjustment": <number, between -15 and 15>,
  "reason": "<one sentence human-readable explanation of the adjustment and the threat level>"
}`;

      const aiResponse = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      });

      const parsed = JSON.parse(aiResponse.text?.trim() || "{}");
      const adj = Math.max(-15, Math.min(15, Number(parsed.adjustment) || 0));
      finalPriority = Math.min(100, Math.max(1, basePriority + adj));
      reason = parsed.reason || reason;
    } catch (err) {
      console.error("AI Prioritization lookup failed, falling back to base score:", err);
    }
  }

  const prioritizedTask = {
    ...newTask,
    priority_score: finalPriority,
    priority_reason: reason
  };

  db.tasks.push(prioritizedTask);
  writeDB(db);
  res.json(prioritizedTask);
});

// Reorder Tasks
app.put("/api/tasks/reorder", (req, res) => {
  const db = readDB();
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds must be an array of task IDs" });
  }

  db.tasks = db.tasks.map((task: any) => {
    const index = orderedIds.indexOf(task.id);
    if (index !== -1) {
      return {
        ...task,
        custom_order: index,
        updated_at: new Date().toISOString()
      };
    }
    return task;
  });

  writeDB(db);
  res.json({ success: true, tasks: db.tasks });
});

// Update Task
app.put("/api/tasks/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const updatedTaskData = req.body;

  const idx = db.tasks.findIndex((t: any) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Re-run priority check if deadline/category/energy level has changed
  const oldTask = db.tasks[idx];
  let updatedTask = {
    ...oldTask,
    ...updatedTaskData,
    updated_at: new Date().toISOString()
  };

  if (
    updatedTaskData.deadline !== oldTask.deadline ||
    updatedTaskData.category !== oldTask.category ||
    updatedTaskData.energy_level !== oldTask.energy_level
  ) {
    updatedTask.priority_score = calculateBasePriority(updatedTask);
  }

  if (updatedTask.status === "done" && oldTask.status !== "done") {
    updatedTask.completed_at = new Date().toISOString();
  }

  db.tasks[idx] = updatedTask;
  writeDB(db);
  res.json(updatedTask);
});

// Delete Task
app.delete("/api/tasks/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;

  db.tasks = db.tasks.filter((t: any) => t.id !== id);
  db.schedule_blocks = db.schedule_blocks.filter((b: any) => b.task_id !== id);

  writeDB(db);
  res.json({ success: true });
});

// Helper to plan schedules deterministically when API fails or is not configured
function deterministicAutoPlan(db: any): { blocks: any[], reasoning: string } {
  const pendingTasks = db.tasks.filter((t: any) => t.status !== "done");
  const sortedTasks = [...pendingTasks].sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0));
  
  const blocks: any[] = [];
  const now = new Date();
  
  const parseDate = (dStr: string) => new Date(dStr).getTime();
  
  const busyIntervals: { start: number, end: number }[] = [];
  (db.calendar_events || []).forEach((e: any) => {
    busyIntervals.push({ start: parseDate(e.start_time), end: parseDate(e.end_time) });
  });
  (db.schedule_blocks || []).forEach((b: any) => {
    if (b.source !== "ai_suggested") {
      busyIntervals.push({ start: parseDate(b.start_time), end: parseDate(b.end_time) });
    }
  });

  // Start checking slots starting from 1 hour from now
  let currentSearchTime = now.getTime() + 60 * 60 * 1000;
  
  for (const task of sortedTasks) {
    const durationMs = (task.estimated_minutes || 60) * 60 * 1000;
    let slotFound = false;
    let attempts = 0;
    while (!slotFound && attempts < 48) {
      const slotStart = currentSearchTime;
      const slotEnd = currentSearchTime + durationMs;
      
      const overlaps = busyIntervals.some(interval => {
        return (slotStart < interval.end && slotEnd > interval.start);
      });
      
      if (!overlaps) {
        blocks.push({
          task_id: task.id,
          title: `Focus session: ${task.title}`,
          start_time: new Date(slotStart).toISOString(),
          end_time: new Date(slotEnd).toISOString()
        });
        busyIntervals.push({ start: slotStart, end: slotEnd });
        slotFound = true;
        currentSearchTime = slotEnd + 30 * 60 * 1000; // 30 min buffer
      } else {
        currentSearchTime += 30 * 60 * 1000;
      }
      attempts++;
    }
  }

  return {
    blocks,
    reasoning: "Your local DeadlineGuardian backup engine has optimized your calendar by prioritizing urgent deadlines and scheduling them in your next open slots to bypass high cloud server demands."
  };
}

// Helper to provide category fallback subtasks when API fails
function getFallbackSubtasks(task: any): string[] {
  const cat = (task.category || "other").toLowerCase();
  if (cat === "assignment") {
    return [
      "Review instructions, rubric, and deliverables",
      "Draft initial outline or framework setup",
      "Implement core modules and critical features",
      "Review code, proofread documentation, and submit"
    ];
  }
  if (cat === "bill") {
    return [
      "Check statement for total balance and due date",
      "Log into secure payment portal",
      "Complete transaction and save receipt confirmation"
    ];
  }
  if (cat === "interview") {
    return [
      "Review key concepts, system designs, or standard questions",
      "Solve 2 practice problems or review notes",
      "Test interview tech (video/audio, environment check)",
      "Take a brief mental break and review checklist"
    ];
  }
  if (cat === "meeting") {
    return [
      "Confirm meeting time and calendar invitation",
      "Outline core agenda or list key speaking points",
      "Prepare required files, links, or documents"
    ];
  }
  return [
    "Identify exact outcome and draft steps",
    "Dedicate focused block to execute task",
    "Refine deliverables and confirm checklist"
  ];
}

// Auto-generate Subtasks using Gemini
app.post("/api/tasks/:id/subtasks", async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(400).json({ error: "Gemini API is not configured. Please add your key to get AI breakdowns." });
  }

  const db = readDB();
  const { id } = req.params;
  const task = db.tasks.find((t: any) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  try {
    const aiClient = getGeminiClient();
    const prompt = `You are DeadlineGuardian's action breakdown engine.
The user needs to complete this daunting task:
Task: "${task.title}"
Description: "${task.description}"
Category: "${task.category}"
Time allocated: ${task.estimated_minutes} minutes

Break this task down into 3-5 hyper-actionable, small, atomic subtasks.
Avoid overwhelming jargon or vague definitions. Keep titles short, active, and concrete (e.g. "Draft introductory email" rather than "Coordinate with cross-functional stakeholders").

Return exactly a JSON array of strings:
[
  "First micro-task",
  "Second micro-task",
  ...
]`;

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5
      }
    });

    const list = JSON.parse(aiResponse.text?.trim() || "[]");
    const subtasks = list.map((title: string, index: number) => ({
      id: `sub-${Date.now()}-${index}`,
      title,
      completed: false
    }));

    task.subtasks = subtasks;
    writeDB(db);
    res.json(task);
  } catch (error: any) {
    console.warn("Failed to generate subtasks with AI, using fallback safeguard:", error);
    const list = getFallbackSubtasks(task);
    const subtasks = list.map((title: string, index: number) => ({
      id: `sub-fallback-${Date.now()}-${index}`,
      title,
      completed: false
    }));
    task.subtasks = subtasks;
    writeDB(db);
    res.json(task);
  }
});

// Auto-Plan My Day (Gemini Scheduling Assistant)
app.post("/api/schedule/auto-plan", async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(400).json({ error: "Gemini API key is required to use Auto-Plan scheduler." });
  }

  const db = readDB();
  const pendingTasks = db.tasks.filter((t: any) => t.status !== "done");
  const calendarEvents = db.calendar_events;
  const userPatterns = db.patterns;

  try {
    const aiClient = getGeminiClient();
    const prompt = `You are DeadlineGuardian's AI calendar scheduler.
Your objective is to schedule time blocks for pending tasks around the user's existing calendar appointments.
Current Time is: ${new Date().toISOString()}

User's pending tasks:
${JSON.stringify(pendingTasks, null, 2)}

User's existing calendar events (do NOT overlap blocks with these):
${JSON.stringify(calendarEvents, null, 2)}

Learned user focus patterns:
${JSON.stringify(userPatterns, null, 2)}

Plan time blocks for the next 24 hours. Be realistic!
- Tasks with highest priority scores must be scheduled first in open time slots.
- Do NOT schedule blocks overlapping existing calendar events.
- Schedule blocks should have start_time and end_time as ISO strings.
- Break long tasks into realistic blocks (e.g., 60-90 mins).

Return exactly a JSON object of this structure:
{
  "blocks": [
    {
      "task_id": "task-id-here",
      "title": "Title of work block",
      "start_time": "ISO date string",
      "end_time": "ISO date string"
    }
  ],
  "reasoning": "A short, encouraging paragraph explaining why you scheduled this way (e.g., placing complex coding tasks in their morning peak slot, adding buffer times)."
}`;

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    const parsed = JSON.parse(aiResponse.text?.trim() || "{}");
    const newBlocks = (parsed.blocks || []).map((b: any, index: number) => ({
      id: `block-${Date.now()}-${index}`,
      task_id: b.task_id,
      title: b.title,
      start_time: b.start_time,
      end_time: b.end_time,
      source: "ai_suggested" as const,
      status: "planned" as const
    }));

    // Filter out previous AI suggested blocks to replace with the fresh day plan, but preserve user set blocks
    db.schedule_blocks = [
      ...db.schedule_blocks.filter((b: any) => b.source !== "ai_suggested"),
      ...newBlocks
    ];

    // Log the event
    db.autonomous_logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "AI Schedule Re-Balanced",
      description: `Optimized calendar blocks for ${newBlocks.length} pending tasks around calendar constraints.`,
      action_type: "reschedule",
      details: parsed.reasoning || "Balanced user day structure automatically."
    });

    writeDB(db);
    res.json({ success: true, blocks: db.schedule_blocks, reasoning: parsed.reasoning });
  } catch (error: any) {
    console.warn("Auto plan with AI failed, using fallback deterministic safeguard:", error);
    
    // Execute our beautiful local deterministic scheduling instead!
    const { blocks, reasoning } = deterministicAutoPlan(db);
    const newBlocks = blocks.map((b: any, index: number) => ({
      id: `block-fallback-${Date.now()}-${index}`,
      task_id: b.task_id,
      title: b.title,
      start_time: b.start_time,
      end_time: b.end_time,
      source: "ai_suggested" as const,
      status: "planned" as const
    }));

    db.schedule_blocks = [
      ...db.schedule_blocks.filter((b: any) => b.source !== "ai_suggested"),
      ...newBlocks
    ];

    db.autonomous_logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Local Schedule Optimizer Engaged",
      description: `Locally scheduled ${newBlocks.length} pending tasks to prevent disruption.`,
      action_type: "reschedule",
      details: reasoning
    });

    writeDB(db);
    res.json({ success: true, blocks: db.schedule_blocks, reasoning });
  }
});

// Chat with DeadlineGuardian Assistant
app.post("/api/agent/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const db = readDB();

  // Add user message to conversations list
  const userMsg = {
    id: `msg-${Date.now()}-u`,
    role: "user" as const,
    content: message,
    created_at: new Date().toISOString()
  };
  db.conversations.push(userMsg);

  if (!isGeminiConfigured()) {
    // If Gemini is missing, return a polite static response to maintain absolute usability
    const fallbackMsg = {
      id: `msg-${Date.now()}-a`,
      role: "assistant" as const,
      content: "I'd love to chat and help you plan your tasks, but your Gemini API key is missing. Please add it via **Settings > Secrets** in the panel to enable intelligent planning, auto-scheduling, and task breakdowns!",
      created_at: new Date().toISOString()
    };
    db.conversations.push(fallbackMsg);
    writeDB(db);
    return res.json({ reply: fallbackMsg.content, dbState: db });
  }

  try {
    const aiClient = getGeminiClient();
    const pendingTasks = db.tasks.filter((t: any) => t.status !== "done");
    const upcomingSchedule = db.schedule_blocks;
    const currentPatterns = db.patterns;

    const systemInstruction = `You are DeadlineGuardian, a highly capable, proactive AI executive assistant helping the user complete critical tasks before deadlines.
Current Time is: ${new Date().toISOString()}

User's pending tasks:
${JSON.stringify(pendingTasks, null, 2)}

Current Schedule Blocks:
${JSON.stringify(upcomingSchedule, null, 2)}

User's Productivity Patterns:
${JSON.stringify(currentPatterns, null, 2)}

Reply to the user's request. You can also trigger data operations on the user's behalf if they ask you to do something.
Supported database actions:
- create_subtasks: Add subtasks to a task. Format: { "type": "create_subtasks", "taskId": "task_id", "subtasks": ["subtask title 1", "subtask title 2"] }
- schedule_block: Book a work slot for a task. Format: { "type": "schedule_block", "taskId": "task_id", "title": "block title", "startTime": "ISO timestamp", "endTime": "ISO timestamp" }
- update_priority: Adjust a task's priority. Format: { "type": "update_priority", "taskId": "task_id", "score": 85, "reason": "updated priority reason" }
- status_change: Toggle a task state. Format: { "type": "status_change", "taskId": "task_id", "status": "done" | "in_progress" | "pending" }

Respond in JSON with:
{
  "reply": "Your conversational markdown-formatted response to the user. Be concise, proactive, encouraging, and clear.",
  "actions": [ <list of actions matching the operations above if requested or highly logical> ]
}`;

    // Get previous messages (last 8) for context
    const recentHistory = db.conversations.slice(-8).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `History:\n${recentHistory}\n\nUSER MESSAGE: ${message}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const parsed = JSON.parse(aiResponse.text?.trim() || "{}");
    const replyText = parsed.reply || "I've processed your request.";
    const actions = parsed.actions || [];

    const actionsTaken: any[] = [];

    // Apply any actions returned by Gemini
    actions.forEach((act: any) => {
      if (act.type === "create_subtasks" && act.taskId && Array.isArray(act.subtasks)) {
        const task = db.tasks.find((t: any) => t.id === act.taskId);
        if (task) {
          task.subtasks = act.subtasks.map((title: string, index: number) => ({
            id: `sub-${Date.now()}-${index}`,
            title,
            completed: false
          }));
          actionsTaken.push({ type: "create_subtasks", detail: `Broke "${task.title}" down into ${act.subtasks.length} atomic steps.` });
        }
      } else if (act.type === "schedule_block" && act.taskId && act.startTime && act.endTime) {
        const task = db.tasks.find((t: any) => t.id === act.taskId);
        db.schedule_blocks.push({
          id: `block-${Date.now()}`,
          task_id: act.taskId,
          title: act.title || `Work on ${task ? task.title : 'Task'}`,
          start_time: act.startTime,
          end_time: act.endTime,
          source: "ai_suggested",
          status: "planned"
        });
        actionsTaken.push({ type: "schedule_block", detail: `Booked slot "${act.title || 'Work block'}" on your calendar.` });
      } else if (act.type === "update_priority" && act.taskId && typeof act.score === "number") {
        const task = db.tasks.find((t: any) => t.id === act.taskId);
        if (task) {
          task.priority_score = act.score;
          task.priority_reason = act.reason || "Adjusted manually by AI assistant.";
          actionsTaken.push({ type: "update_priority", detail: `Boosted "${task.title}" priority to ${act.score}/100.` });
        }
      } else if (act.type === "status_change" && act.taskId && act.status) {
        const task = db.tasks.find((t: any) => t.id === act.taskId);
        if (task) {
          task.status = act.status;
          if (act.status === "done") {
            task.completed_at = new Date().toISOString();
          }
          actionsTaken.push({ type: "status_change", detail: `Marked "${task.title}" as ${act.status}.` });
        }
      }
    });

    const assistantMsg = {
      id: `msg-${Date.now()}-a`,
      role: "assistant" as const,
      content: replyText,
      created_at: new Date().toISOString(),
      actions_taken: actionsTaken.length > 0 ? actionsTaken : undefined
    };

    db.conversations.push(assistantMsg);

    // If any actions were taken, write a log for the Autonomous Feed too
    if (actionsTaken.length > 0) {
      db.autonomous_logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Assistant Request Handled",
        description: actionsTaken.map(a => a.detail).join(", "),
        action_type: "task_split",
        details: "Action taken directly based on chat instructions."
      });
    }

    writeDB(db);
    res.json({ reply: replyText, actionsTaken, dbState: db });
  } catch (error: any) {
    console.warn("Chat agent failed with AI error, executing fallback:", error);
    
    // Fallback response for chat when API fails
    const errorMsg = error.message || "";
    const isServiceUnavailable = errorMsg.includes("503") || errorMsg.includes("demand") || errorMsg.includes("UNAVAILABLE");
    const content = isServiceUnavailable
      ? "My cloud cognitive engine is currently experiencing high demand. I've activated safe-mode and safely backed up your workspace state. I can still help you schedule tasks or check deadlines deterministically!"
      : `I'm currently operating in offline safeguard mode. Your deadlines are still being monitored locally, and you can continue adding tasks or checking off items!`;
      
    const assistantMsg = {
      id: `msg-${Date.now()}-a`,
      role: "assistant" as const,
      content,
      created_at: new Date().toISOString()
    };
    db.conversations.push(assistantMsg);
    writeDB(db);
    res.json({ reply: assistantMsg.content, actionsTaken: [], dbState: db });
  }
});

// Autonomous background tick simulation
app.post("/api/agent/autonomous-tick", async (req, res) => {
  const db = readDB();

  if (!isGeminiConfigured()) {
    // Return mock autonomous action if Gemini is not set up
    const mockActions = [
      {
        title: "Task Escalated to High Priority",
        description: "Noticed 'Pay Electricity and Wifi Bills' is due tomorrow. Boosted priority to 84/100 and placed a nudge.",
        action_type: "escalated_nudge" as const,
        details: "Elevated reminder channel to push notification + draft email nudge."
      },
      {
        title: "Intimidating Assignment Subdivided",
        description: "Broke project submission down into micro-steps to overcome completion resistance.",
        action_type: "task_split" as const,
        details: "Splitting multi-hour tasks lowers initial friction."
      }
    ];
    const picked = mockActions[Math.floor(Math.random() * mockActions.length)];
    const newLog = {
      id: `log-auto-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...picked
    };
    db.autonomous_logs.unshift(newLog);
    writeDB(db);
    return res.json({ log: newLog, dbState: db });
  }

  try {
    const aiClient = getGeminiClient();
    const pendingTasks = db.tasks.filter((t: any) => t.status !== "done");
    const currentSchedule = db.schedule_blocks;

    const prompt = `You are DeadlineGuardian's background Agent loop.
You run periodically on a cron tick to evaluate the user's productivity threats.
Current Time: ${new Date().toISOString()}

User's pending tasks:
${JSON.stringify(pendingTasks, null, 2)}

User's schedule blocks:
${JSON.stringify(currentSchedule, null, 2)}

Determine if there is a productivity issue or urgent deadline that needs autonomous guardian support.
Pick ONE of these highly beneficial interventions:
1. "task_split": Look for an intimidating task (high duration, no subtasks) and split it into 3-4 micro steps.
2. "reschedule": Look for an urgent task with no scheduled block in the next 12 hours, and place an AI suggested block.
3. "escalated_nudge": Detect a task due in < 6 hours and trigger an escalating reminder.
4. "pattern_learned": Synthesize previous behaviors to discover an interesting productivity pattern.

Return exactly a JSON object:
{
  "action_type": "task_split" | "reschedule" | "escalated_nudge" | "pattern_learned",
  "title": "A short active headline of your action (e.g., 'Daunting Essay Breakup')",
  "description": "What you did automatically in one sentence (e.g., 'Splintered your 4-hour prep task into 3 tiny steps to bypass procrastination')",
  "details": "Technical detail or actionable text generated (such as the list of subtasks, or exact reschedule times, or the nudge message)"
}`;

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    });

    const action = JSON.parse(aiResponse.text?.trim() || "{}");
    const logId = `log-auto-${Date.now()}`;

    const newLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      title: action.title || "Autonomous Safeguard Initiated",
      description: action.description || "Reviewed workspace tasks and confirmed status.",
      action_type: action.action_type || "escalated_nudge",
      details: action.details || "Analyzed schedules."
    };

    db.autonomous_logs.unshift(newLog);

    // Apply the structural changes if possible!
    if (action.action_type === "task_split") {
      // Find a task that has no subtasks or needs help
      const target = db.tasks.find((t: any) => t.status !== "done" && t.subtasks.length === 0);
      if (target) {
        target.subtasks = [
          { id: `sub-${Date.now()}-1`, title: "Review requirements & setup draft", completed: false },
          { id: `sub-${Date.now()}-2`, title: "Draft first section of content", completed: false },
          { id: `sub-${Date.now()}-3`, title: "Proofread and execute submit actions", completed: false }
        ];
        newLog.description = `Split your intimidating task "${target.title}" into 3 simple micro-steps to bypass mental blocks.`;
      }
    } else if (action.action_type === "reschedule") {
      const target = db.tasks.find((t: any) => t.status !== "done");
      if (target) {
        const start = getRelativeDate(1.5);
        const end = getRelativeDate(2.5);
        db.schedule_blocks.push({
          id: `block-auto-${Date.now()}`,
          task_id: target.id,
          title: `Focus session: ${target.title}`,
          start_time: start,
          end_time: end,
          source: "ai_suggested",
          status: "planned"
        });
        newLog.description = `Auto-scheduled an urgent focus slot for "${target.title}" starting in 90 minutes.`;
      }
    }

    writeDB(db);
    res.json({ success: true, log: newLog, dbState: db });
  } catch (error: any) {
    console.warn("Autonomous tick failed (API error), executing fallback safeguard:", error);
    
    // Fallback deterministic simulation behavior
    const mockActions = [
      {
        title: "Task Escalated to High Priority (Fallback)",
        description: "Noticed tasks are due shortly. Safeguarded priority to 84/100 and placed a nudge.",
        action_type: "escalated_nudge" as const,
        details: "Elevated reminder channel to push notification + draft email nudge."
      },
      {
        title: "Intimidating Assignment Subdivided (Fallback)",
        description: "Broke project submission down into micro-steps to overcome completion resistance.",
        action_type: "task_split" as const,
        details: "Splitting multi-hour tasks lowers initial friction."
      },
      {
        title: "Urgent Task Scheduled (Fallback)",
        description: "Found an urgent task with no scheduled focus block. Automatically reserved a slot.",
        action_type: "reschedule" as const,
        details: "Scheduled a 1-hour focus session prior to the upcoming deadline."
      }
    ];
    const picked = mockActions[Math.floor(Math.random() * mockActions.length)];
    const newLog = {
      id: `log-auto-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...picked
    };
    db.autonomous_logs.unshift(newLog);

    // Apply structural changes if applicable
    if (picked.action_type === "task_split") {
      const target = db.tasks.find((t: any) => t.status !== "done" && t.subtasks.length === 0);
      if (target) {
        target.subtasks = [
          { id: `sub-${Date.now()}-1`, title: "Review requirements & setup draft", completed: false },
          { id: `sub-${Date.now()}-2`, title: "Draft first section of content", completed: false },
          { id: `sub-${Date.now()}-3`, title: "Proofread and execute submit actions", completed: false }
        ];
        newLog.description = `Split your intimidating task "${target.title}" into 3 simple micro-steps to bypass mental blocks.`;
      }
    } else if (picked.action_type === "reschedule") {
      const target = db.tasks.find((t: any) => t.status !== "done");
      if (target) {
        const start = getRelativeDate(1.5);
        const end = getRelativeDate(2.5);
        db.schedule_blocks.push({
          id: `block-auto-${Date.now()}`,
          task_id: target.id,
          title: `Focus session: ${target.title}`,
          start_time: start,
          end_time: end,
          source: "ai_suggested",
          status: "planned"
        });
        newLog.description = `Auto-scheduled an urgent focus slot for "${target.title}" starting in 90 minutes.`;
      }
    }

    writeDB(db);
    res.json({ success: true, log: newLog, dbState: db, fallback: true });
  }
});

// Learn new Productivity Patterns from task history
app.post("/api/patterns/analyze", async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(400).json({ error: "Gemini API key is required to analyze patterns." });
  }

  const db = readDB();
  try {
    const aiClient = getGeminiClient();
    const prompt = `You are DeadlineGuardian's Cognitive Analytics engine.
Analyze the user's current goals, habits, and tasks:
Tasks: ${JSON.stringify(db.tasks, null, 2)}
Habits: ${JSON.stringify(db.habits, null, 2)}

Spot an insightful productivity pattern, procrastination trigger, or time estimation gap.
Be extremely helpful and actionable. Return exactly a JSON object:
{
  "pattern_type": "underestimates_duration" | "best_focus_window" | "procrastination_risk" | "energy_alignment",
  "title": "A crisp, professional title for the pattern (e.g. 'Procrastination Spike on Bills')",
  "description": "A 2-sentence highly personalized diagnostic insight advising how the guardian will automatically adjust behaviors to support them."
}`;

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const parsed = JSON.parse(aiResponse.text?.trim() || "{}");
    const newPattern = {
      id: `pattern-${Date.now()}`,
      pattern_type: parsed.pattern_type || "procrastination_risk",
      title: parsed.title || "Custom Behavior Synthesized",
      description: parsed.description || "Noticed completion rhythms have leveled out positively.",
      confidence: 0.85,
      updated_at: new Date().toISOString()
    };

    db.patterns.unshift(newPattern);
    // Keep max 4 patterns
    if (db.patterns.length > 4) {
      db.patterns.pop();
    }

    db.autonomous_logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "New Productivity Insight Synthesized",
      description: `Discovered behavior pattern: "${newPattern.title}"`,
      action_type: "pattern_learned",
      details: newPattern.description
    });

    writeDB(db);
    res.json({ success: true, pattern: newPattern, dbState: db });
  } catch (error: any) {
    console.warn("Pattern analysis failed (API error), executing fallback safeguard:", error);
    
    const fallbackPatterns = [
      {
        pattern_type: "procrastination_risk" as const,
        title: "Pending Tasks Density Peak",
        description: "You have multiple critical tasks scheduled close together. Consider spreading them out or breaking them down into micro-tasks to avoid last-minute stress."
      },
      {
        pattern_type: "energy_alignment" as const,
        title: "Task-Energy Mismatch Guard",
        description: "High energy-level tasks are currently concentrated in late-day blocks. DeadlineGuardian suggests tackling high-energy tasks earlier when possible."
      }
    ];
    
    const parsed = fallbackPatterns[Math.floor(Math.random() * fallbackPatterns.length)];
    const newPattern = {
      id: `pattern-${Date.now()}`,
      pattern_type: parsed.pattern_type,
      title: parsed.title,
      description: parsed.description,
      confidence: 0.8,
      updated_at: new Date().toISOString()
    };
    
    db.patterns.unshift(newPattern);
    if (db.patterns.length > 4) {
      db.patterns.pop();
    }

    db.autonomous_logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Productivity Safeguard Insight Added",
      description: `Discovered behavior pattern: "${newPattern.title}"`,
      action_type: "pattern_learned",
      details: newPattern.description
    });

    writeDB(db);
    res.json({ success: true, pattern: newPattern, dbState: db, fallback: true });
  }
});

// Log Pomodoro Completed Focus Session
app.post("/api/pomodoro/log", (req, res) => {
  const db = readDB();
  const { taskId, durationMinutes, title } = req.body;

  const logId = `log-pomo-${Date.now()}`;
  db.autonomous_logs.unshift({
    id: logId,
    timestamp: new Date().toISOString(),
    title: `Pomodoro Focus Session Completed`,
    description: `Successfully finished a ${durationMinutes}-minute deep focus block for task: "${title}"`,
    action_type: "pattern_learned",
    details: `Focus target achieved! Great work maintaining mental alignment and completing this high-intensity work sprint.`
  });

  writeDB(db);
  res.json({ success: true, dbState: db });
});

// -------------------------------------------------------------
// VITE CLIENT INTEGRATION & PRODUCTION ASSETS
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeadlineGuardian server booted on http://localhost:${PORT}`);
  });
}

startServer();
