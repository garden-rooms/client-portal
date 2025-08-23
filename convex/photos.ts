import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

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
    const enrichedPhotos = [];
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

    // 🔔 Notifications (email + DB row) using scheduler -> action
    if (args.isVisible) {
      const projectTitle = project?.name ?? "your project";

      try {
        if (userProfile.role === "admin") {
          // Admin uploaded → notify the client
          if (project.clientId) {
            const client = await ctx.db.get(project.clientId);
            const recipientEmail = client?.email;
            if (recipientEmail) {
              await ctx.scheduler.runAfter(0, api.notifications.notifyUser, {
                userId: project.clientId,
                recipientEmail,
                projectId: args.projectId,
                projectTitle,
                event: "photo",
                title: args.title,
                message: `A new photo "${args.title}" has been uploaded to your project.`,
                actorUserId: userId as any,
              });
            }
          }
        } else {
          // Client uploaded → notify all admins
          const allProfiles = await ctx.db.query("userProfiles").collect();
          const adminProfiles = allProfiles.filter((p) => p.role === "admin");

          for (const profile of adminProfiles) {
            const admin = await ctx.db.get(profile.userId);
            const recipientEmail = admin?.email;
            if (!recipientEmail) continue;

            await ctx.scheduler.runAfter(0, api.notifications.notifyUser, {
              userId: profile.userId,
              recipientEmail,
              projectId: args.projectId,
              projectTitle,
              event: "photo",
              title: args.title,
              message: `A new photo "${args.title}" was uploaded by the client.`,
              actorUserId: userId as any,
            });
          }
        }
      } catch (err) {
        console.log("notifyUser(photo) failed:", err);
      }
    }

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

    await ctx.db.patch(args.photoId, {
      isVisible: args.isVisible,
    });

    // If made visible -> notify client
    if (args.isVisible) {
      try {
        const project = await ctx.db.get(photo.projectId);
        if (project?.clientId) {
          const client = await ctx.db.get(project.clientId);
          const recipientEmail = client?.email;
          const projectTitle = project?.name ?? "your project";
          if (recipientEmail) {
            await ctx.scheduler.runAfter(0, api.notifications.notifyUser, {
              userId: project.clientId,
              recipientEmail,
              projectId: photo.projectId,
              projectTitle,
              event: "photo",
              title: "Photo Now Available",
              message: `Photo "${photo.title}" is now available for viewing.`,
              actorUserId: userId as any,
            });
          }
        }
      } catch (err) {
        console.log("notifyUser(toggle photo visibility) failed:", err);
      }
    }

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
