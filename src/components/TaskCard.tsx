import React, { useState } from "react";
import { Task, SubTask } from "../types";
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Sparkles, 
  AlertTriangle,
  Zap
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (id: string, status: Task["status"]) => void;
  onUpdateSubtasks: (id: string, subtasks: SubTask[]) => void;
  onDeleteTask: (id: string) => void;
  onTriggerSubtasks: (id: string) => void;
  isGeneratingSubtasks: boolean;
}

export default function TaskCard({
  task,
  onUpdateStatus,
  onUpdateSubtasks,
  onDeleteTask,
  onTriggerSubtasks,
  isGeneratingSubtasks
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Generate deterministic trend of the priority score over the last 24 hours
  const trendData = React.useMemo(() => {
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
      // Smooth gradient interpolation based on deadline proximity to avoid rough staircase graph
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
  }, [task.deadline, task.category, task.energy_level, task.estimated_minutes]);

  const themeColor = task.priority_score >= 80 
    ? "#ef4444" 
    : task.priority_score >= 50 
      ? "#f59e0b" 
      : "#6366f1";

  const formatDeadline = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 0) {
      return { text: `Overdue by ${Math.abs(Math.round(diffMins / 60))}h`, class: "text-red-500 font-semibold" };
    }
    if (diffMins < 60) {
      return { text: `Due in ${diffMins} mins!`, class: "text-amber-500 font-bold animate-pulse" };
    }
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) {
      return { text: `Due in ${diffHours}h`, class: "text-amber-500 font-semibold" };
    }
    return { text: `Due ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, class: "text-slate-500" };
  };

  const deadlineInfo = formatDeadline(task.deadline);

  const toggleSubtask = (subId: string) => {
    const updated = task.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
    onUpdateSubtasks(task.id, updated);
  };

  const addManualSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub-man-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false
    };
    onUpdateSubtasks(task.id, [...task.subtasks, newSub]);
    setNewSubtaskTitle("");
  };

  const completedCount = task.subtasks.filter(s => s.completed).length;
  const progressPercent = task.subtasks.length > 0 ? Math.round((completedCount / task.subtasks.length) * 100) : 0;

  const categoryLabels: Record<Task["category"], { text: string; bg: string; textCol: string }> = {
    assignment: { text: "Assignment", bg: "bg-indigo-500/10 border border-indigo-500/20", textCol: "text-indigo-300" },
    bill: { text: "Bill Payment", bg: "bg-rose-500/10 border border-rose-500/20", textCol: "text-rose-300" },
    meeting: { text: "Meeting Prep", bg: "bg-sky-500/10 border border-sky-500/20", textCol: "text-sky-300" },
    interview: { text: "Interview Prep", bg: "bg-emerald-500/10 border border-emerald-500/20", textCol: "text-emerald-300" },
    other: { text: "Commitment", bg: "bg-slate-800/60 border border-slate-700/50", textCol: "text-slate-300" }
  };

  const energyLabels: Record<Task["energy_level"], { icon: React.ReactNode; text: string; class: string }> = {
    low: { icon: <Zap className="w-3.5 h-3.5 text-slate-400" />, text: "Low Energy", class: "text-slate-300 bg-slate-800/40 border-slate-700/50" },
    medium: { icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, text: "Medium Energy", class: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
    high: { icon: (
      <div className="flex gap-0.5">
        <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400/50" />
        <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400/50" />
      </div>
    ), text: "High Focus Required", class: "text-orange-300 bg-orange-500/10 border-orange-500/20" }
  };

  const currentCategory = categoryLabels[task.category];
  const currentEnergy = energyLabels[task.energy_level];

  return (
    <div 
      id={`task-card-${task.id}`}
      className={`group relative bg-slate-900/45 backdrop-blur-md border rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-[0_0_25px_rgba(99,102,241,0.08)] ${
        task.status === "done" 
          ? "opacity-60 border-white/5 bg-slate-950/20" 
          : "border-white/10 hover:border-indigo-500/30"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* State Toggle Checkbox */}
        <button 
          id={`toggle-status-${task.id}`}
          onClick={() => onUpdateStatus(task.id, task.status === "done" ? "pending" : "done")}
          className="mt-1 transition-all active:scale-90 text-slate-400 hover:text-indigo-400 focus:outline-hidden"
        >
          {task.status === "done" ? (
            <CheckCircle className="w-6 h-6 text-emerald-400 fill-emerald-500/10" />
          ) : (
            <Circle className="w-6 h-6 text-slate-500 group-hover:text-indigo-400/80 transition-colors" />
          )}
        </button>

        {/* Task Details Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md font-semibold ${currentCategory.bg} ${currentCategory.textCol}`}>
              {currentCategory.text}
            </span>
            <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${currentEnergy.class}`}>
              {currentEnergy.icon}
              <span className="font-medium">{currentEnergy.text}</span>
            </div>
            
            {/* Priority Score Bubble & Sparkline */}
            <div className="ml-auto flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div 
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    task.priority_score >= 80 
                      ? "bg-rose-500/10 text-rose-300 border-rose-500/20" 
                      : task.priority_score >= 50 
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20" 
                        : "bg-slate-800/60 text-slate-300 border-slate-700/50"
                  }`}
                  title="Calculated Priority Score (0-100)"
                >
                  <AlertTriangle className="w-3 h-3 text-current shrink-0" />
                  <span>Priority: {task.priority_score}</span>
                </div>
              </div>

              {/* Sparkline trend over last 24h */}
              <div className="flex items-center gap-2 bg-slate-950/40 border border-white/5 py-0.5 px-2 rounded-lg">
                <div className="h-5 w-14" title="24-hour priority score trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                      <defs>
                        <linearGradient id={`sparklineGrad-${task.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeColor} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-950 text-white text-[9px] px-1.5 py-0.5 rounded border border-white/10 shadow-lg font-mono select-none pointer-events-none">
                                {payload[0].value}
                              </div>
                            );
                          }
                          return null;
                        }}
                        position={{ y: -22 }}
                        cursor={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke={themeColor}
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill={`url(#sparklineGrad-${task.id})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider select-none">Trend</span>
              </div>
            </div>
          </div>

          <h3 className={`text-base font-medium text-white tracking-tight ${task.status === "done" ? "line-through text-slate-500" : ""}`}>
            {task.title}
          </h3>
          
          <p className="text-sm text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className={`${deadlineInfo.class} font-medium`}>{deadlineInfo.text}</span>
            </div>
            <div className="bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">
              <span>{task.estimated_minutes}m est.</span>
            </div>
            {task.subtasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-slate-400 font-medium">{completedCount}/{task.subtasks.length} steps</span>
              </div>
            )}
          </div>

          {/* AI Reasoning Notice */}
          {task.priority_reason && (
            <div className="mt-4 p-3 bg-slate-950/50 rounded-xl border border-white/5 text-xs text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="text-indigo-300">Guardian Insight:</strong> {task.priority_reason}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse and Subtasks Panel */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
        <button 
          id={`expand-toggle-${task.id}`}
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Steps</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>View Micro-Steps ({task.subtasks.length})</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          {task.subtasks.length === 0 && task.status !== "done" && (
            <button
              id={`ai-breakdown-btn-${task.id}`}
              onClick={() => onTriggerSubtasks(task.id)}
              disabled={isGeneratingSubtasks}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-500/15 to-pink-500/15 hover:from-indigo-500/25 hover:to-pink-500/25 border border-indigo-500/30 text-indigo-200 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              <span>{isGeneratingSubtasks ? "Generating..." : "AI Breakdown Steps"}</span>
            </button>
          )}

          <button 
            id={`delete-btn-${task.id}`}
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Delete commitment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Action Breakdown Checklist
          </h4>
          
          <div className="space-y-1.5">
            {task.subtasks.map((sub) => (
              <label 
                key={sub.id} 
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-950/40 border border-transparent hover:border-white/5 cursor-pointer text-sm text-slate-300 transition-all"
              >
                <input 
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => toggleSubtask(sub.id)}
                  className="w-4 h-4 text-indigo-600 bg-slate-950 border-white/10 rounded-sm focus:ring-indigo-500/50 focus:ring-offset-0 focus:outline-hidden"
                />
                <span className={sub.completed ? "line-through text-slate-500" : "text-slate-300"}>
                  {sub.title}
                </span>
              </label>
            ))}

            {task.subtasks.length === 0 && (
              <p className="text-xs text-slate-500 italic py-1">
                No micro-steps generated. Hit "AI Breakdown Steps" to generate small atomic goals.
              </p>
            )}
          </div>

          <form onSubmit={addManualSubtask} className="flex gap-2 pt-1">
            <input 
              type="text"
              placeholder="Add micro-step manually..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="flex-1 text-sm px-3.5 py-2 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500/50 focus:bg-slate-950/70 transition-all"
            />
            <button 
              type="submit"
              className="px-3 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 rounded-xl transition-all active:scale-95 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
