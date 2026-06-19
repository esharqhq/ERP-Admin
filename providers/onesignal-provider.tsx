"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";

export function OneSignalProvider() {
  useEffect(() => {
    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
      allowLocalhostAsSecureOrigin: true,
    });
  }, []);

  return null;
}
