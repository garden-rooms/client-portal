import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current user profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...user,
      profile,
    };
  },
});

// Create or update user profile
export const createOrUpdateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("client")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // Security: Only allow admin role if user is being invited by an admin
    // Self-registrations are always clients
    let finalRole = args.role;
    if (!existingProfile) {
      // New profile - check if this is a self-registration or admin invitation
      const user = await ctx.db.get(userId);
      if (user && !user.emailVerificationTime) {
        // This is a self-registration, force client role
        finalRole = "client";
      }
    } else {
      // Updating existing profile - only admins can change roles
      const currentUserProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      
      if (currentUserProfile?.role !== "admin" && args.role !== existingProfile.role) {
        throw new Error("Only admins can change user roles");
      }
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        company: args.company,
        phone: args.phone,
        role: finalRole,
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        firstName: args.firstName,
        lastName: args.lastName,
        company: args.company,
        phone: args.phone,
        role: finalRole,
        isActive: true,
      });
    }
  },
});

// Get all clients (admin only)
export const getAllClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentUserProfile || currentUserProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const clientProfiles = await ctx.db
      .query("userProfiles")
      .collect();

    const clients = [];
    for (const profile of clientProfiles) {
      if (profile.role === "client") {
        const user = await ctx.db.get(profile.userId);
        if (user) {
          clients.push({
            ...user,
            profile,
          });
        }
      }
    }

    return clients;
  },
});

// Invite client (admin only)
export const inviteClient = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentUserProfile || currentUserProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create user account with emailVerificationTime to mark as invited
    const newUserId = await ctx.db.insert("users", {
      email: args.email,
      emailVerificationTime: Date.now(),
    });

    // Create client profile
    await ctx.db.insert("userProfiles", {
      userId: newUserId,
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company,
      role: "client",
      isActive: true,
    });

    // TODO: Send invitation email
    
    return newUserId;
  },
});
