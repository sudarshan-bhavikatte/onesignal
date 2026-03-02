import axios from "axios";
import { z } from "zod";
import { stdResponse, StdResponse } from "@digicroz/js-kit";
import { TNotificationResult, TPushNotificationToSpecificUsers } from "./types";

const PushNotificationToSpecificUsersSchema = z.object({
  heading: z.string().min(1, "heading is required"),
  message: z.string().min(1, "message is required"),
  onClickLink: z.string().url("onClickLink must be a valid URL"),
  oneSignalApiKey: z.string().min(1, "oneSignalApiKey is required"),
  oneSignalAppId: z.string().min(1, "oneSignalAppId is required"),
  thumbnailUrl: z.string().url("thumbnailUrl must be a valid URL").optional().or(z.literal("")).default(""),
  externalUserIds: z.array(z.string().min(1)).min(1, "at least one externalUserId is required"),
});

export const pushNotificationToSpecificUsers = async ({
  heading,
  message,
  onClickLink,
  oneSignalApiKey,
  oneSignalAppId,
  thumbnailUrl = "",
  externalUserIds,
}: TPushNotificationToSpecificUsers): Promise<StdResponse<TNotificationResult, string>> => {

  const parsed = PushNotificationToSpecificUsersSchema.safeParse({
    heading, message, onClickLink, oneSignalApiKey, oneSignalAppId, thumbnailUrl, externalUserIds,
  });

  if (!parsed.success) {
    return stdResponse.error("invalid_input", parsed.error.message ?? "Invalid input");
  }

  try {
    const response = await axios.post(
      "https://api.onesignal.com/notifications",
      {
        app_id: parsed.data.oneSignalAppId,
        headings: { en: parsed.data.heading },
        contents: { en: parsed.data.message },
        big_picture: parsed.data.thumbnailUrl,
        url: parsed.data.onClickLink,
        priority: 10,
        target_channel: "push",
        include_aliases: {
          external_id: parsed.data.externalUserIds,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${parsed.data.oneSignalApiKey}`,
        },
      }
    );

    const resData = response.data;

    if (resData.id) {
      const invalidIds: string[] = resData.errors?.invalid_aliases?.external_id ?? [];
      if (invalidIds.length > 0 && invalidIds.length === parsed.data.externalUserIds.length) {
        return stdResponse.error(
          "invalid_external_user_ids",
          `All external IDs not found in OneSignal: ${invalidIds.join(", ")}`
        );
      }
      return stdResponse.success({ id: resData.id });
    }

    return stdResponse.error("ONESIGNAL_ERROR", "Notification failed: no ID returned");

  } catch (error: any) {
    const status: number = error?.response?.status;
    const errors: any = error?.response?.data?.errors;

    if (status === 401 || status === 403) {
      return stdResponse.error("oneSignal_credentials_incorrect", "Invalid OneSignal App ID or API Key");
    }

    if (Array.isArray(errors)) {
      const msg: string = errors[0] ?? "";
      if (msg.toLowerCase().includes("rate limit")) return stdResponse.error("rate_limit_exceeded", msg);
      if (
        msg.toLowerCase().includes("no subscribers") ||
        msg.toLowerCase().includes("not subscribed") ||
        msg.toLowerCase().includes("no active subscriptions")
      ) return stdResponse.error("no_active_subscribers_found", msg);
      return stdResponse.error("unknown_OneSignal_error", msg || "Contact Developer");
    }

    if (errors?.invalid_aliases?.external_id) {
      const invalidIds: string[] = errors.invalid_aliases.external_id;
      return stdResponse.error(
        "invalid_external_user_ids",
        `External IDs not found in OneSignal: ${invalidIds.join(", ")}`
      );
    }

    return stdResponse.error("unknown_OneSignal_error", "Contact Developer");
  }
};