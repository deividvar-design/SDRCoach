import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { VOICES } from "@/lib/domain/voices";

/** Voice picker grouped by gender. An empty value keeps the agent's default voice. */
export function VoiceSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="voice_id">Voice</Label>
      <Select id="voice_id" name="voice_id" defaultValue={defaultValue ?? ""}>
        <option value="">Default (Sarah, woman)</option>
        <optgroup label="Women">
          {VOICES.filter((v) => v.gender === "woman").map((v) => (
            <option key={v.id} value={v.id}>{v.name} · {v.note}</option>
          ))}
        </optgroup>
        <optgroup label="Men">
          {VOICES.filter((v) => v.gender === "man").map((v) => (
            <option key={v.id} value={v.id}>{v.name} · {v.note}</option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
