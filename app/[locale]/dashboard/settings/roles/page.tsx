import { redirect } from "@/i18n/navigation";

// The Roles page moved into the Admins area (spec: admins-access-unification).
// Old links and bookmarks land on Admins.
export default async function RolesRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/dashboard/settings/admins", locale });
}
