import { redirect } from "next/navigation";

/**
 * The owner KYC queue moved to `/dashboard/owner-documents`, where the documents
 * sit beside the contract they unlock instead of expanding inside a table row.
 *
 * This redirect stays because the old path is not only in bookmarks: notification
 * deep links pointed here too, and a 404 is a worse answer than a redirect.
 */
export default function KycRedirectPage() {
  redirect("/dashboard/owner-documents");
}
