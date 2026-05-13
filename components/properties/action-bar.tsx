import Link from "next/link"
import {ArrowLeft, MoreHorizontal} from "lucide-react"
import {Button} from "@/components/ui/button"

export function ActionBar() {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/properties"/>}
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4"/>
                {`Properties ro'yxatiga qaytish`}
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4"/>
                    <span className="sr-only">{`Qo'shimcha`}</span>
                </Button>
            </div>
        </div>
    )
}
