/** Visitor list filters and status — safe for client and server (no Firebase imports). */

export type VisitorStatus = "pending" | "converted";

export type VisitorStatusFilter = VisitorStatus | "all";
