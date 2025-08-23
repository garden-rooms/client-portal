/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as additionalWork from "../additionalWork.js";
import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as milestones from "../milestones.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as notify_summary from "../notify_summary.js";
import type * as photos from "../photos.js";
import type * as projects from "../projects.js";
import type * as router from "../router.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  additionalWork: typeof additionalWork;
  auth: typeof auth;
  documents: typeof documents;
  emails: typeof emails;
  http: typeof http;
  invitations: typeof invitations;
  milestones: typeof milestones;
  notes: typeof notes;
  notifications: typeof notifications;
  notify_summary: typeof notify_summary;
  photos: typeof photos;
  projects: typeof projects;
  router: typeof router;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
