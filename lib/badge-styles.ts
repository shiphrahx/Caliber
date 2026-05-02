// Centralised badge colour tokens for priority, status, and seniority level.
// Import from here — never define these inline in components.

export const PRIORITY_BADGE: Record<string, { bg: string; color: string; dot: string }> = {
  "Low":       { bg: "#0f1526", color: "#818cf8", dot: "#818cf8" },
  "Medium":    { bg: "#1e1a00", color: "#facc15", dot: "#facc15" },
  "High":      { bg: "#2a1400", color: "#fb923c", dot: "#fb923c" },
  "Very High": { bg: "#2a0a0a", color: "#f87171", dot: "#f87171" },
}

export const STATUS_BADGE: Record<string, { bg: string; color: string; dot: string }> = {
  "Not started": { bg: "#1a1a22", color: "#6b7280", dot: "#6b7280" },
  "In progress": { bg: "#0c1a3d", color: "#60a5fa", dot: "#3b82f6" },
  "Blocked":     { bg: "#2a1200", color: "#f97316", dot: "#ea580c" },
  "Done":        { bg: "#0d2015", color: "#4ade80", dot: "#22c55e" },
}

export const LEVEL_BADGE: Record<string, { bg: string; color: string }> = {
  "Junior":    { bg: "#0d1420", color: "#818cf8" },
  "Mid":       { bg: "#0a1a2e", color: "#5b9bd5" },
  "Senior":    { bg: "#0f1a0a", color: "#4ade80" },
  "Staff":     { bg: "#1a1200", color: "#c9a227" },
  "Principal": { bg: "#1e0d00", color: "#e07030" },
  "Other":     { bg: "#222222", color: "#888888" },
}
