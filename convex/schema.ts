import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Extended user profile
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("client")),
    firstName: v.string(),
    lastName: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_user", ["userId"]),

  // Projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    clientId: v.id("users"),
    status: v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("on_hold")
    ),
    createdBy: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    budget: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // Documents (quotes, invoices, contracts, etc.)
  documents: defineTable({
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
    uploadedBy: v.id("users"),
    isVisible: v.boolean(),
    requiresApproval: v.boolean(),
    approvalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined")
    )),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    approvalNotes: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_approval_status", ["approvalStatus"]),

  // Additional Work Items (new feature)
  additionalWork: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined")
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    clientNotes: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // Photos
  photos: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    caption: v.optional(v.string()),
    fileId: v.id("_storage"),
    fileName: v.string(),
    uploadedBy: v.id("users"),
    isVisible: v.boolean(),
    category: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_uploader", ["uploadedBy"]),

  // Project notes/updates
  projectNotes: defineTable({
    projectId: v.id("projects"),
    content: v.string(),
    createdBy: v.id("users"),
    isVisible: v.boolean(),
    isPinned: v.boolean(),
  })
    .index("by_project", ["projectId"])
    .index("by_pinned", ["isPinned"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
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
    isRead: v.boolean(),
    emailSent: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["isRead"]),

  // Milestones
  milestones: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    order: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_order", ["order"]),

  // Change requests/variations (Phase 2)
  changeRequests: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    requestedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("in_review")
    ),
    estimatedCost: v.optional(v.number()),
    estimatedTime: v.optional(v.string()),
    adminResponse: v.optional(v.string()),
    respondedBy: v.optional(v.id("users")),
    respondedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // Messages (Phase 2)
  messages: defineTable({
    projectId: v.id("projects"),
    senderId: v.id("users"),
    content: v.string(),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    isRead: v.boolean(),
  })
    .index("by_project", ["projectId"])
    .index("by_sender", ["senderId"]),

  // Audit trail
  auditLogs: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_entity", ["entityType", "entityId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
