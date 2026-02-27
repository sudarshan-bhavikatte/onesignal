import axios from "axios";
import { stdResponse, StdResponse } from "@digicroz/js-kit";
import { TNotificationResult, TPushNotificationToSpecificUsers} from "./types";

export const pushNotificationToSpecificUsers = async ({
  heading,
  message,
  onClickLink,
  oneSignalApiKey,
  oneSignalAppId,
  thumbnailUrl = "",
  externalUserIds,
  }: TPushNotificationToSpecificUsers): Promise<StdResponse<TNotificationResult, string>> => {
  try {
    const response = await axios.post(
      "https://api.onesignal.com/notifications",
      {
        app_id: oneSignalAppId,
        headings: { en: heading },
        contents: { en: message },
        big_picture: thumbnailUrl,
        url: onClickLink,
        priority: 10,
        target_channel: "push",
        include_aliases: {
          external_id: externalUserIds,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${oneSignalApiKey}`,
        },
      }
    );

    const resData = response.data;

    if (resData.id) {
      const invalidIds: string[] = resData.errors?.invalid_aliases?.external_id ?? [];

      if (invalidIds.length > 0 && invalidIds.length === externalUserIds.length) {
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
      return stdResponse.error(
        "oneSignal_credentials_incorrect",
        "Invalid OneSignal App ID or API Key"
      );
    }

    if (Array.isArray(errors)) {
      const msg: string = errors[0] ?? "";

      if (msg.toLowerCase().includes("rate limit")) {
        return stdResponse.error("rate_limit_exceeded", msg);
      }

      if (
        msg.toLowerCase().includes("no subscribers") ||
        msg.toLowerCase().includes("not subscribed") ||
        msg.toLowerCase().includes("no active subscriptions")
      ) {
        return stdResponse.error("no_active_subscribers_found", msg);
      }

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