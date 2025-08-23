import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Sends ONE summary email listing updates since the last summary notification.
 * "Last notification time" = most recent notifications row of type "project_updated"
 * for THIS project's client user.
 */
export const notifyProjectSummary = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<{ sent: boolean; summary?: string }> => {
    // 1) Project + client
    const project = await ctx.runQuery(api.projects.getProject, { projectId });
    if (!project) throw new Error("Project not found");

    const projectTitle = (project as any).name ?? "your project";

    const client = project.clientId
      ? await ctx.runQuery(api.users.getById, { userId: project.clientId })
      : null;
    const recipientEmail = (client as any)?.email as string | undefined;
    if (!recipientEmail) return { sent: false };

    // 2) Since when? (most recent "project_updated" for client+project)
    const since =
      (await ctx.runQuery(api.notifications.getLastSummaryTsForUserProject, {
        userId: project.clientId as Id<"users">,
        projectId,
      })) ?? 0;

    // 3) Count new visible docs/photos since "since"
    const docs = await ctx.runQuery(api.documents.getProjectDocuments, { projectId });
    const photos = await ctx.runQuery(api.photos.getProjectPhotos, { projectId });

    const newDocs = (docs as any[]).filter(
      (d) => d._creationTime > since && d.isVisible
    ).length;

    const newPhotos = (photos as any[]).filter(
      (p) => p._creationTime > since && p.isVisible
    ).length;

    const total = newDocs + newPhotos;
    if (total === 0) return { sent: false };

    // 4) Build and send ONE email
    const portal = process.env.PORTAL_BASE_URL ?? "https://qualityoutdoorrooms.co.uk/portal";
    const parts: string[] = [];
    if (newDocs) parts.push(`${newDocs} new document${newDocs === 1 ? "" : "s"}`);
    if (newPhotos) parts.push(`${newPhotos} new photo${newPhotos === 1 ? "" : "s"}`);
    const summary = parts.join(", ");

    const subject = `Updates in ${projectTitle}: ${summary}`;
    const body =
      `Hello,<br/><br/>We’ve made updates to <strong>${projectTitle}</strong>:` +
      `<ul>` +
      (newDocs ? `<li>${newDocs} new document${newDocs === 1 ? "" : "s"}</li>` : "") +
      (newPhotos ? `<li>${newPhotos} new photo${newPhotos === 1 ? "" : "s"}</li>` : "") +
      `</ul>` +
      `<a href="${portal}">Open your client portal</a><br/><br/>— Quality Outdoor Rooms`;

    await ctx.runAction(api.emails.sendEmail, {
      to: recipientEmail,
      subject,
      body,
      replyTo: "contact@qualityoutdoorrooms.co.uk",
    });

    // 5) Store a "project_updated" notification row (becomes our new reference point)
    const notificationId = await ctx.runMutation(api.notifications.create, {
      userId: project.clientId as Id<"users">,
      projectId,
      type: "project_updated",
      title: "Project updates summary",
      message: summary,
    });
    await ctx.runMutation(api.notifications.setEmailSent, { notificationId });

    return { sent: true, summary };
  },
});