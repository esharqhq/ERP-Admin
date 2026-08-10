import { redirect } from "@/i18n/navigation";

/**
 * The owner KYC queue moved to `/dashboard/owner-documents`, where the documents
 * sit beside the contract they unlock instead of expanding inside a table row.
 *
 * This redirect stays because the old path is not only in bookmarks: notification
 * deep links pointed here too, and a 404 is a worse answer than a redirect.
 *
 * It must be next-intl's `redirect`, not the one from `next/navigation`. That one
 * knows nothing about the `[locale]` segment, so a German admin arriving at
 * `/de/dashboard/kyc` was silently moved to the default locale — the bookmark
 * worked and the language quietly changed.
 *
 * The installed next-intl version's `redirect` takes the object form —
 * `redirect({ href, locale })` — not the positional `redirect(path, locale)`.
 */
export default async function KycRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/dashboard/owner-documents", locale });
}
