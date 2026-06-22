"use client";

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { useAuthStore } from "@/store/auth.store";

export function OneSignalProvider() {
  const adminMe = useAuthStore((s) => s.adminMe);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    })
      .then(() => {
        setIsInitialized(true);
        OneSignal.Notifications.requestPermission();
      })
      .catch(() => {
        // already initialized on SPA re-mount
        setIsInitialized(true);
        if (Notification.permission === "default") {
          OneSignal.Notifications.requestPermission();
        }
      });
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (adminMe?.id) {
      OneSignal.login(`ADMIN:${adminMe.id}`);
    } else {
      OneSignal.logout();
    }
  }, [isInitialized, adminMe?.id]);

  return null;
}
