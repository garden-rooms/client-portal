import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// flip this to true in the future if you ever want to re-enable auto emails
const AUTO_EMAILS_ENABLED = false;

// Get documents for a project
export const getProjectDocuments = query({
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

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter visible documents for clients
    const filteredDocuments =
      userProfile.role === "admin" ? documents : documents.filter((doc) => doc.isVisible);

    // Enrich with uploader information and file URLs
    const enrichedDocuments: any[] = [];
    for (const doc of filteredDocuments) {
      const uploader = await ctx.db.get(doc.uploadedBy);
      const uploaderProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", doc.uploadedBy))
        .unique();

      const fileUrl = await ctx.storage.getUrl(doc.fileId);

      enrichedDocuments.push({
        ...doc,
        fileUrl,
        uploader: {
          ...uploader,
          profile: uploaderProfile,
        },
      });
    }

    return enrichedDocuments;
  },
});

// Upload document
export const uploadDocument = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("quote"),
      v.literal("invoice"),
      v.literal("contract"),
      v.literal("other")
    ),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    isVisible: v.boolean(),
    requiresApproval: v.boolean(),
  },
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

    // Check permissions - only admin can upload documents
    if (userProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const documentId = await ctx.db.insert("documents", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      type: args.type,
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      uploadedBy: userId,
      isVisible: args.isVisible,
      requiresApproval: args.requiresApproval,
      approvalStatus: args.requiresApproval ? "pending" : undefined,
    });

    // NOTE: auto-emails are disabled on purpose.
    // If you want to re-enable in the future, wrap your notify call like:
    // if (AUTO_EMAILS_ENABLED && args.isVisible) { ... }

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: args.projectId,
      action: "document_uploaded",
      entityType: "document",
      entityId: documentId,
      details: `Uploaded document: ${args.title}`,
    });

    return documentId;
  },
});

// Toggle document visibility
export const toggleDocumentVisibility = mutation({
  args: {
    documentId: v.id("documents"),
    isVisible: v.boolean(),
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

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await ctx.db.patch(args.documentId, { isVisible: args.isVisible });

    // NOTE: auto-emails on visibility change are disabled on purpose.
    // If you want to re-enable in the future, gate your notify call with:
    // if (AUTO_EMAILS_ENABLED && args.isVisible) { ... }

    return args.documentId;
  },
});

// Approve/decline document
export const approveDocument = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(v.literal("approved"), v.literal("declined")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    const project = await ctx.db.get(document.projectId);
    if (!project) throw new Error("Project not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check permissions - client can only approve their own project documents
    if (userProfile.role === "client" && project.clientId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.documentId, {
      approvalStatus: args.status,
      approvedBy: userId,
      approvedAt: Date.now(),
      approvalNotes: args.notes,
    });

    // (Keeping your existing admin notifications here)
    const adminProfiles = await ctx.db.query("userProfiles").collect();
    for (const profile of adminProfiles) {
      if (profile.role === "admin") {
        await ctx.db.insert("notifications", {
          userId: profile.userId,
          projectId: document.projectId,
          type: "approval_completed",
          title: `Document ${args.status}`,
          message: `Document "${document.title}" has been ${args.status} by the client.`,
          isRead: false,
          emailSent: false,
        });
      }
    }

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: document.projectId,
      action: `document_${args.status}`,
      entityType: "document",
      entityId: args.documentId,
      details: `${args.status} document: ${document.title}${args.notes ? ` - Notes: ${args.notes}` : ""}`,
    });

    return args.documentId;
  },
});

// Generate upload URL
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});