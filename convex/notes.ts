import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get notes for a project
export const getProjectNotes = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check access permissions
    if (userProfile.role === "client" && project.clientId !== userId) {
      throw new Error("Access denied");
    }

    const notes = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    // Filter visible notes for clients
    const filteredNotes = userProfile.role === "admin" 
      ? notes 
      : notes.filter(note => note.isVisible);

    // Enrich with author information
    const enrichedNotes = [];
    for (const note of filteredNotes) {
      const author = await ctx.db.get(note.createdBy);
      const authorProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", note.createdBy))
        .unique();

      enrichedNotes.push({
        ...note,
        author: {
          ...author,
          profile: authorProfile,
        },
      });
    }

    return enrichedNotes;
  },
});

// Add note (admin only)
export const addNote = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    isVisible: v.boolean(),
    isPinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const noteId = await ctx.db.insert("projectNotes", {
      projectId: args.projectId,
      content: args.content,
      createdBy: userId,
      isVisible: args.isVisible,
      isPinned: args.isPinned,
    });

    // Create notification for client if note is visible
    if (args.isVisible) {
      await ctx.db.insert("notifications", {
        userId: project.clientId,
        projectId: args.projectId,
        type: "note_added",
        title: "New Project Update",
        message: "A new update has been added to your project.",
        isRead: false,
        emailSent: false,
      });
    }

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: args.projectId,
      action: "note_added",
      entityType: "note",
      entityId: noteId,
      details: `Added note: ${args.content.substring(0, 100)}...`,
    });

    return noteId;
  },
});

// Update note
export const updateNote = mutation({
  args: {
    noteId: v.id("projectNotes"),
    content: v.optional(v.string()),
    isVisible: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const updates: any = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.isVisible !== undefined) updates.isVisible = args.isVisible;
    if (args.isPinned !== undefined) updates.isPinned = args.isPinned;

    await ctx.db.patch(args.noteId, updates);

    return args.noteId;
  },
});

// Delete note
export const deleteNote = mutation({
  args: { noteId: v.id("projectNotes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    await ctx.db.delete(args.noteId);

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: note.projectId,
      action: "note_deleted",
      entityType: "note",
      entityId: args.noteId,
      details: `Deleted note: ${note.content.substring(0, 100)}...`,
    });

    return args.noteId;
  },
});
