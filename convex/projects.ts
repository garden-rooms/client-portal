import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => ctx.db.get(projectId),
});


// Get projects for current user
export const getMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    let projects;
    if (userProfile.role === "admin") {
      // Admin sees all projects
      projects = await ctx.db.query("projects").collect();
    } else {
      // Client sees only their projects
      projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", userId))
        .collect();
    }

    // Enrich with client information
    const enrichedProjects = [];
    for (const project of projects) {
      const client = await ctx.db.get(project.clientId);
      const clientProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", project.clientId))
        .unique();

      enrichedProjects.push({
        ...project,
        client: {
          ...client,
          profile: clientProfile,
        },
      });
    }

    return enrichedProjects;
  },
});

// Get single project
export const getProject = query({
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

    // Get client information
    const client = await ctx.db.get(project.clientId);
    const clientProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", project.clientId))
      .unique();

    return {
      ...project,
      client: {
        ...client,
        profile: clientProfile,
      },
    };
  },
});

// Create project (admin only)
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clientId: v.id("users"),
    budget: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      clientId: args.clientId,
      status: "planning",
      createdBy: userId,
      budget: args.budget,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Create notification for client
    await ctx.db.insert("notifications", {
      userId: args.clientId,
      projectId,
      type: "project_updated",
      title: "New Project Created",
      message: `A new project "${args.name}" has been created for you.`,
      isRead: false,
      emailSent: false,
    });

    return projectId;
  },
});

// Update project
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("on_hold")
    )),
    budget: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.budget !== undefined) updates.budget = args.budget;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;

    await ctx.db.patch(args.projectId, updates);

    // Create notification for client if status changed
    if (args.status && args.status !== project.status) {
      await ctx.db.insert("notifications", {
        userId: project.clientId,
        projectId: args.projectId,
        type: "project_updated",
        title: "Project Status Updated",
        message: `Project "${project.name}" status changed to ${args.status}.`,
        isRead: false,
        emailSent: false,
      });
    }

    return args.projectId;
  },
});
