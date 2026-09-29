import Image from "next/image";
import { cn } from "@/lib/utils";

export function FeatureRow({ eyebrow, title, body, image, alt, flip = false, width = 1440, height = 900 }: { eyebrow: string; title: string; body: React.ReactNode; image: string; alt: string; flip?: boolean; width?: number; height?: number }) {
  return (
    <div className={cn("grid items-center gap-8 md:grid-cols-2 md:gap-14", flip && "md:[&>*:first-child]:order-2")}>
      <div>
        <p className="text-muted-foreground text-xs">{eyebrow}</p>
        <h3 className="font-display mt-3 text-3xl text-balance md:text-4xl">{title}</h3>
        <div className="text-muted-foreground mt-4 space-y-3">{body}</div>
      </div>
      <div className="overflow-hidden rounded-2xl border shadow-lg">
        <Image src={image} alt={alt} width={width} height={height} sizes="(min-width: 768px) 50vw, 100vw" className="h-auto w-full" />
      </div>
    </div>
  );
}
