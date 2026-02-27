export type TBaseNotification = {
  heading: string;
  message: string;
  onClickLink: string;
  oneSignalApiKey: string;
  oneSignalAppId: string;
  thumbnailUrl?: string;
};

export type TPushNotificationToAllUsers = TBaseNotification;

export type TPushNotificationToSpecificUsers = TBaseNotification & {
  externalUserIds: string[];
};

export type TNotificationResult = { id: string };