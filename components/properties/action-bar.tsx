import Link from "next/link"
import {ArrowLeft, MoreHorizontal} from "lucide-react"
import {Button} from "@/components/ui/button"
import {useTranslations} from "next-intl"

export function ActionBar() {
    const t = useTranslations("properties.actions")

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/properties" />}
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4"/>
                {t("backToList")}
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4"/>
                    <span className="sr-only">{t("more")}</span>
                </Button>
            </div>
        </div>
    )
}
