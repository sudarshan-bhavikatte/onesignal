import axios from "axios";
import { stdResponse, StdResponse } from "@digicroz/js-kit";
import { TNotificationResult, TPushNotificationToAllUsers} from "./types";

export const pushNotificationToAllUsers = async ({
  heading,
  message,
  onClickLink,
  oneSignalApiKey,
  oneSignalAppId,
  thumbnailUrl = "",
}: TPushNotificationToAllUsers): Promise<StdResponse<TNotificationResult, string>> => {
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
        included_segments: ["All"],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${oneSignalApiKey}`,
        },
      }
    );

    if (response.data.id) {
      return stdResponse.success({ id: response.data.id });
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

      return stdResponse.error("ONESIGNAL_ERROR", msg || "Unknown OneSignal error");
    }

    return stdResponse.error("ONESIGNAL_ERROR", "Unknown OneSignal error");
  }
};