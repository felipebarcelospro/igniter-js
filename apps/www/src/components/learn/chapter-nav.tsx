import Link from "next/link";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface ChapterNavProps {
  current: {
    number: number;
    title: string;
  };
  next?: {
    number: number;
    title: string;
    description: string;
    href: string;
  };
  isCompleted?: boolean;
}
export function ChapterNav({
  current,
  next,
  isCompleted = true,
}: ChapterNavProps) {
  return (
    <div className="relative mx-auto mb-8 mt-4 flex w-full flex-col items-start md:my-20 md:mt-12 bg-card/10 rounded-t-lg border p-6">

      <div className="flex items-center space-x-6">
        {/* Completion Circle */}
        <div
          aria-hidden="true"
          className="relative flex size-16 items-center justify-center rounded-lg bg-card text-[48px] font-semibold border"
        >
          {current.number}
          <div className="absolute bottom-0 right-0 flex size-8 translate-x-3 translate-y-3 items-center justify-center bg-card/50 backdrop-blur-3xl border rounded-full">
            <Check className="size-3 text-white" />
          </div>
        </div>

        {/* Completion Text */}
        <div>
          <div className="font-mono">
            You've Completed Chapter {current.number}
          </div>
          <div className="text-center">
            <div className="font-mono text-muted-foreground">
              Congratulations! You've learned about {current.title.toLowerCase()}.
            </div>
          </div>
        </div>
      </div>

      {/* Next Chapter Section */}
      {next && (
        <div className="border bg-card mt-8 flex w-full flex-col rounded-lg md:mt-12 overflow-hidden">
          <div className="border-b bg-background w-full flex flex-col p-4">
            <div className="text-sm opacity-40">Next Up</div>
            <div className="text-md font-mono">
              {next.number}: {next.title}
            </div>
            
          </div>
          <div className="w-full md:w-fit p-4 space-y-4">
            <div className="max-w-[540px] font-mono text-sm">
              {next.description}
            </div>

            <Button className="rounded-full" asChild>
              <Link href={next.href}>
                <span className="truncate px-1.5">
                  Start Chapter {next.number}
                </span>
                <ArrowRight className="ml-1 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
