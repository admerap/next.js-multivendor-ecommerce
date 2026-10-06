import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Empty state for a level whose parent level has nothing yet (e.g. sub-categories with no categories). */
export function MissingParentState({ icon, title, description, href, cta }: { icon: LucideIcon; title: string; description: string; href: string; cta: string }) {
  return (
    <EmptyState bare icon={icon} title={title} description={description}>
      <Button asChild>
        <Link href={href} className="!text-on-primary">
          <ArrowRight aria-hidden />
          {cta}
        </Link>
      </Button>
    </EmptyState>
  );
}
