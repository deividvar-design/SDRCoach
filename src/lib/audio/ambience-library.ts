import type { Ambience } from "@/lib/domain/moods";

/** The places that have a background loop. "quiet" has none. */
export const AMBIENCE_KINDS = ["office", "open_office", "car", "street", "home", "cafe", "station"] as const satisfies readonly Exclude<Ambience, "quiet">[];
export type AmbienceKind = (typeof AMBIENCE_KINDS)[number];

export const AMBIENCE_LABEL: Record<AmbienceKind, string> = {
  office: "At their desk",
  open_office: "Open-plan office",
  car: "In the car",
  street: "Walking in the city",
  home: "Working from home",
  cafe: "In a café",
  station: "At a train station",
};

/**
 * What ElevenLabs is asked to record for each place. Every prompt rules out music and clear speech, so nothing in
 * the background competes with the prospect's voice.
 */
export const AMBIENCE_PROMPTS: Record<AmbienceKind, string> = {
  office: "Quiet private office room tone: soft air conditioning hum, occasional keyboard typing nearby, a distant muffled phone ringing once, no music, no speech, seamless ambient loop",
  open_office: "Busy open-plan office ambience: indistinct background chatter with no intelligible words, keyboards typing, a desk phone ringing in the distance, chairs moving, no music, seamless ambient loop",
  car: "Inside a moving car on a motorway, heard from the driver seat with the windows closed: steady road and engine rumble, tyre noise, an occasional car passing, a turn signal ticking briefly, no music, no radio, seamless ambient loop",
  street: "City street sidewalk ambience: traffic passing, a bus pulling away, distant car horns, a far-off siren, footsteps, indistinct passers-by with no intelligible words, no music, seamless ambient loop",
  home: "Quiet home office ambience: soft room tone, a ticking clock, a dog barking once in another room, distant kitchen sounds, no music, no television, seamless ambient loop",
  cafe: "Busy coffee shop ambience: indistinct chatter with no intelligible words, cups and saucers clinking, an espresso machine steaming, no music, seamless ambient loop",
  station: "Train station concourse ambience: large hall reverb, crowd murmur with no intelligible words, rolling suitcases, a train arriving in the distance, a short station chime, no music, seamless ambient loop",
};

/** Public URL of a place's loop in the `ambience` storage bucket. */
export function ambienceUrl(kind: AmbienceKind) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ambience/${kind}.mp3`;
}

export const isAmbienceKind = (v: string): v is AmbienceKind => (AMBIENCE_KINDS as readonly string[]).includes(v);
