"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { useAuthStore } from "@/store/auth.store";

export function OneSignalProvider() {
  const adminMe = useAuthStore((s) => s.adminMe);

  useEffect(() => {
    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    })
      .then(() => {
        OneSignal.Notifications.requestPermission();
      })
      .catch(() => {
        // already initialized on SPA re-mount — request permission if not yet granted
        if (Notification.permission === "default") {
          OneSignal.Notifications.requestPermission();
        }
      });
  }, []);

  useEffect(() => {
    if (adminMe?.id) {
      OneSignal.login(`ADMIN:${adminMe.id}`);
    } else {
      OneSignal.logout();
    }
  }, [adminMe?.id]);

  return null;
}
