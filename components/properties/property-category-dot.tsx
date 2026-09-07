"use client";

import { usePropertyCategories } from "@/hooks/use-lookups";
import { resolveCategoryColor } from "@/lib/properties/category-color";

export interface PropertyCategoryDotProps {
  categoryId: string | null;
  categoryName?: string | null;
  size?: number;
  className?: string;
}

export function PropertyCategoryDot({
  categoryId,
  categoryName,
  size = 6,
  className,
}: PropertyCategoryDotProps) {
  const { data } = usePropertyCategories();
  const color = resolveCategoryColor(categoryId, data ?? []);

  return (
    <span
      aria-label={categoryName ?? "Uncategorized"}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: color,
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}
