// convex/notifications.ts
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/* =========================
   READ QUERIES
   ========================= */

export const getMyNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);

    return notifications;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return notifications.filter((n) => !n.isRead).length;
  },
});

/* =========================
   WRITE MUTATIONS
   ========================= */

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    if (notification.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
    return args.notificationId;
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
    return unread.length;
  },
});

/**
 * Create a notification row (schema-aligned).
 * Table fields expected:
 * - userId, projectId
 * - type: one of the explicit strings below
 * - title: string
 * - message: string
 * - isRead: boolean
 * - emailSent: boolean
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("document_uploaded"),
      v.literal("photo_uploaded"),
      v.literal("note_added"),
      v.literal("approval_requested"),
      v.literal("approval_completed"),
      v.literal("project_updated"),
      v.literal("additional_work_requested")
    ),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { userId, projectId, type, title, message }) => {
    return await ctx.db.insert("notifications", {
      userId,
      projectId,
      type,
      title,
      message,
      isRead: false,
      emailSent: false,
    });
  },
});

export const setEmailSent = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, { emailSent: true });
    return notificationId;
  },
});

/* =========================
   ACTIONS (EMAIL ORCHESTRATION)
   ========================= */

type NotifyEvent = "document" | "photo" | "message";
type TableType =
  | "document_uploaded"
  | "photo_uploaded"
  | "note_added"
  | "approval_requested"
  | "approval_completed"
  | "project_updated"
  | "additional_work_requested";

function mapEventToType(event: NotifyEvent): TableType {
  if (event === "document") return "document_uploaded";
  if (event === "photo") return "photo_uploaded";
  return "note_added";
}



// Returns the _creationTime of the most recent "project_updated" notification
// for THIS user + THIS project. Uses the existing by_user index; filters by projectId in memory.
export const getLastSummaryTsForUserProject = query({
  args: { userId: v.id("users"), projectId: v.id("projects") },
  handler: async (ctx, { userId, projectId }) => {
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100); // small window is fine; increase if needed

    const last = rows.find(
      (n) => n.type === "project_updated" && n.projectId === projectId
    );
    return last?._creationTime ?? 0;
  },
});
export const notifyUser = action({
  args: {
    userId: v.id("users"),
    recipientEmail: v.string(),
    projectId: v.id("projects"),
    projectTitle: v.string(),
    event: v.union(v.literal("document"), v.literal("photo"), v.literal("message")),
    title: v.optional(v.string()),   // will default below
    message: v.optional(v.string()), // will default below
    actorUserId: v.optional(v.id("users")), // skip emailing the actor
  },
  handler: async (
    ctx,
    {
      userId,
      recipientEmail,
      projectId,
      projectTitle,
      event,
      title,
      message,
      actorUserId,
    }: {
      userId: Id<"users">;
      recipientEmail: string;
      projectId: Id<"projects">;
      projectTitle: string;
      event: NotifyEvent;
      title?: string;
      message?: string;
      actorUserId?: Id<"users">;
    }
  ): Promise<{ ok: true; notificationId: Id<"notifications"> }> => {
    // 1) Map to table type and finalize strings
    const type: TableType = mapEventToType(event);

    const finalTitle: string =
      title ??
      (event === "document" ? "New document" : event === "photo" ? "New photos" : "New message");

    const finalMessage: string = message ?? `There is an update in ${projectTitle}.`;

    // 2) Create the notification row
    const notificationId: Id<"notifications"> = await ctx.runMutation(
      api.notifications.create,
      {
        userId,
        projectId,
        type,
        title: finalTitle,
        message: finalMessage,
      }
    );

    // 3) Email (skip if emailing the actor)
    if (!actorUserId || actorUserId !== userId) {
// AFTER
const base =
  process.env.PORTAL_BASE_URL ?? "https://qualityoutdoorrooms.co.uk/portal";
// We’ll just send them to the portal; after login they’ll see their projects.
const link = base;
 const what =
        type === "document_uploaded"
          ? "a new document"
          : type === "photo_uploaded"
          ? "new photos"
          : "a new message";

      const subject = `Update in ${projectTitle}: ${what}`;
      const body =
        `Hello,<br/><br/>There is ${what} in <strong>${projectTitle}</strong>` +
        (title ? `: <strong>${title}</strong>` : "") +
        (message ? `<div style="margin-top:8px;color:#555">${message}</div>` : "") +
        `<br/><br/><a href="${link}">Open project</a><br/><br/>— Quality Outdoor Rooms`;

      await ctx.runAction(api.emails.sendEmail, {
        to: recipientEmail,
        subject,
        body,
        replyTo: "contact@qualityoutdoorrooms.co.uk",
      });

      // 4) Mark as emailed
      await ctx.runMutation(api.notifications.setEmailSent, { notificationId });
    }

    return { ok: true, notificationId };
  },
});
