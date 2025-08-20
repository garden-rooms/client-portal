// convex/emails.ts
import { mutation } from "convex/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const test = mutation({
  args: { to: v.string() },
  handler: async (ctx, { to }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY missing in Convex env");

    const resend = new Resend(apiKey, {
      baseUrl: process.env.RESEND_BASE_URL, // ok if undefined
    });

    // Use a guaranteed sender while testing; swap to your domain after verifying in Resend.
    const from = "Quality Outdoor Rooms <onboarding@resend.dev>";
    const subject = "Client Portal test email";
    const html = `<p>If you see this, Convex → Resend works ✅</p>`;

    try {
      const result = await resend.emails.send({ from, to, subject, html });
      console.log("emails.test result", JSON.stringify(result));
      return result;
    } catch (e) {
      console.error("emails.test failed", e);
      throw e;
    }
  },
});
