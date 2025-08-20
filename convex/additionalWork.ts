import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get additional work items for a project
export const getProjectAdditionalWork = query({
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

    const additionalWork = await ctx.db
      .query("additionalWork")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Enrich with creator information and file URLs
    const enrichedWork = [];
    for (const work of additionalWork) {
      const creator = await ctx.db.get(work.createdBy);
      const creatorProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", work.createdBy))
        .unique();

      const fileUrl = work.fileId ? await ctx.storage.getUrl(work.fileId) : null;

      enrichedWork.push({
        ...work,
        fileUrl,
        creator: {
          ...creator,
          profile: creatorProfile,
        },
      });
    }

    return enrichedWork;
  },
});

// Create additional work item (admin only)
export const createAdditionalWork = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
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

    const workId = await ctx.db.insert("additionalWork", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      price: args.price,
      fileId: args.fileId,
      fileName: args.fileName,
      createdBy: userId,
      status: "pending",
    });

    // Create notification for client
    await ctx.db.insert("notifications", {
      userId: project.clientId,
      projectId: args.projectId,
      type: "additional_work_requested",
      title: "Additional Work Requested",
      message: `Additional work "${args.title}" (£${args.price.toFixed(2)}) has been proposed for your project.`,
      isRead: false,
      emailSent: false,
    });

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: args.projectId,
      action: "additional_work_created",
      entityType: "additionalWork",
      entityId: workId,
      details: `Created additional work: ${args.title} - £${args.price.toFixed(2)}`,
    });

    return workId;
  },
});

// Approve/decline additional work (client only)
export const approveAdditionalWork = mutation({
  args: {
    workId: v.id("additionalWork"),
    status: v.union(v.literal("approved"), v.literal("declined")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const work = await ctx.db.get(args.workId);
    if (!work) throw new Error("Additional work not found");

    const project = await ctx.db.get(work.projectId);
    if (!project) throw new Error("Project not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check permissions - only the client can approve their project's additional work
    if (userProfile.role === "client" && project.clientId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.workId, {
      status: args.status,
      approvedBy: userId,
      approvedAt: Date.now(),
      clientNotes: args.notes,
    });

    // Create notification for admin
    const adminProfiles = await ctx.db.query("userProfiles").collect();
    for (const profile of adminProfiles) {
      if (profile.role === "admin") {
        await ctx.db.insert("notifications", {
          userId: profile.userId,
          projectId: work.projectId,
          type: "approval_completed",
          title: `Additional Work ${args.status}`,
          message: `Additional work "${work.title}" has been ${args.status} by the client.`,
          isRead: false,
          emailSent: false,
        });
      }
    }

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: work.projectId,
      action: `additional_work_${args.status}`,
      entityType: "additionalWork",
      entityId: args.workId,
      details: `${args.status} additional work: ${work.title}${args.notes ? ` - Notes: ${args.notes}` : ''}`,
    });

    return args.workId;
  },
});
