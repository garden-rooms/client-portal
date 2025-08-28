import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get photos for a project
export const getProjectPhotos = query({
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

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter visible photos for clients
    const filteredPhotos =
      userProfile.role === "admin" ? photos : photos.filter((photo) => photo.isVisible);

    // Enrich with uploader information and file URLs
    const enrichedPhotos: any[] = [];
    for (const photo of filteredPhotos) {
      const uploader = await ctx.db.get(photo.uploadedBy);
      const uploaderProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", photo.uploadedBy))
        .unique();

      const fileUrl = await ctx.storage.getUrl(photo.fileId);

      enrichedPhotos.push({
        ...photo,
        fileUrl,
        uploader: {
          ...uploader,
          profile: uploaderProfile,
        },
      });
    }

    return enrichedPhotos;
  },
});

// Upload photo
export const uploadPhoto = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    caption: v.optional(v.string()),
    fileId: v.id("_storage"),
    fileName: v.string(),
    category: v.optional(v.string()),
    isVisible: v.boolean(),
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

    // Check permissions - both admin and client can upload photos (but client only on own project)
    if (userProfile.role === "client" && project.clientId !== userId) {
      throw new Error("Access denied");
    }

    const photoId = await ctx.db.insert("photos", {
      projectId: args.projectId,
      title: args.title,
      caption: args.caption,
      fileId: args.fileId,
      fileName: args.fileName,
      uploadedBy: userId,
      isVisible: args.isVisible,
      category: args.category,
    });

    // NOTE: auto-emails are intentionally disabled.

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: args.projectId,
      action: "photo_uploaded",
      entityType: "photo",
      entityId: photoId,
      details: `Uploaded photo: ${args.title}`,
    });

    return photoId;
  },
});

// Toggle photo visibility (admin only)
export const togglePhotoVisibility = mutation({
  args: {
    photoId: v.id("photos"),
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

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error("Photo not found");

    await ctx.db.patch(args.photoId, { isVisible: args.isVisible });

    // NOTE: auto-emails on visibility change are intentionally disabled.

    return args.photoId;
  },
});

// Delete photo
export const deletePhoto = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error("Photo not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check permissions - admin can delete any photo, client can only delete their own
    if (userProfile.role === "client" && photo.uploadedBy !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.photoId);

    // Log audit trail
    await ctx.db.insert("auditLogs", {
      userId,
      projectId: photo.projectId,
      action: "photo_deleted",
      entityType: "photo",
      entityId: args.photoId,
      details: `Deleted photo: ${photo.title}`,
    });

    return args.photoId;
  },
});
