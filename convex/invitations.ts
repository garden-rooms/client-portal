// convex/invitations.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const inviteClientAndEmail = action({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    company: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args: {
      email: string;
      firstName: string;
      lastName: string;
      company?: string;
    }
  ): Promise<{ ok: boolean; userId: string }> => {
    // Make sure current user is admin
    const me = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!me?.profile || me.profile.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Create user + profile via users.inviteClient
    const newUserId: string = await ctx.runMutation(api.users.inviteClient, {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company,
    });

    // Send invitation email
    await ctx.runAction(api.emails.sendEmail, {
      to: args.email,
      subject: "You're invited to Quality Outdoor Rooms client portal",
      body: `Hi ${args.firstName},<br/><br/>
        You've been invited to join our client portal. Please click the link below to set up your account:<br/>
        <a href="https://qualityoutdoorrooms.co.uk/portal">Join Now</a><br/><br/>
        – Quality Outdoor Rooms`,
    });

    return { ok: true, userId: newUserId };
  },
});
