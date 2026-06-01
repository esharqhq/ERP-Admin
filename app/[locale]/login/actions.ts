"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction() {
  const store = await cookies();
  store.delete("auth-token");
  redirect("/login");
}
