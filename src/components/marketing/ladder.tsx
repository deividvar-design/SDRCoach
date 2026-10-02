import { LEVEL_LIST } from "@/lib/domain/levels";
import { cn } from "@/lib/utils";

const FIRST_LINE: Record<string, string> = { warm: "Hi, this is Dana.", inbound: "Dana speaking.", cold: "Yeah?" };

/** The three levels as rungs: each one taller and darker than the last. Vertical on phones. */
export function Ladder() {
  return (
    <ol className="grid gap-3 md:grid-cols-3 md:items-end md:gap-0">
      {LEVEL_LIST.map((l, i) => (
        <li
          key={l.id}
          className={cn(
            "flex flex-col p-7 md:p-8",
            i === 0 && "bg-card rounded-2xl border md:min-h-[300px] md:rounded-r-none md:border-r-0",
            i === 1 && "bg-secondary rounded-2xl border md:min-h-[360px] md:rounded-none",
            i === 2 && "stage text-background rounded-2xl md:min-h-[420px] md:rounded-l-none",
          )}
        >
          <div className={cn("dial text-xs", i === 2 ? "text-background/60" : "text-muted-foreground")}>LEVEL 0{l.level}</div>
          <p className="font-display mt-5 text-4xl leading-tight md:text-5xl">“{FIRST_LINE[l.id]}”</p>
          <div className="mt-auto pt-8">
            <h3 className="text-lg font-medium">{l.name}</h3>
            <p className="text-signal mt-1 text-sm">{l.tagline}</p>
            <p className={cn("mt-2 text-sm", i === 2 ? "text-background/70" : "text-muted-foreground")}>{l.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
