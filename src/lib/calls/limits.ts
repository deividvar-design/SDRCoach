/** Workspace calls end at eight minutes. The prospect is told to wrap up a minute before, so the end sounds like a prospect, not a timer. */
export const MAX_CALL_SECONDS = 8 * 60;
export const WRAP_UP_AT_SECONDS = MAX_CALL_SECONDS - 60;
export const WRAP_UP_MESSAGE = "You have about one minute left on this call. In your next turn, say you have to go, bring the conversation to a natural close in a sentence or two, and end the call. Do not mention a timer.";
