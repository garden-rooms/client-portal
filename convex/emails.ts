// convex/emails.ts
import { action } from "./_generated/server"; // note: generated server import
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { to, subject, body } = args;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY missing in Convex env vars");

    const baseUrl = process.env.RESEND_BASE_URL || "https://api.resend.com";
    const from = "Quality Outdoor Rooms <contact@qualityoutdoorrooms.co.uk>"; // change once domain verified

    const res = await fetch(`${baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html: `<p>${body}</p>` }),
    });

    const text = await res.text();
    console.log("sendEmail status", res.status, text);
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${text}`);
    return { ok: true };
  },
});

