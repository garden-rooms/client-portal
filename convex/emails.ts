// convex/emails.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const { to, subject, body } = args;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY missing in Convex env vars");

    // Always hit Resend directly (no proxy)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Quality Outdoor Rooms <portal@qualityoutdoorrooms.co.uk>", // verified domain
        to,
        subject,
        html: `<p>${body}</p>`,
      }),
    });

    const text = await res.text();
    console.log("sendEmail status", res.status, text);
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${text}`);
    return { ok: true };
  },
});
