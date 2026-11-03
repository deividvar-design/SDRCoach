/**
 * The pricing page calculator: what a month of live conversations costs a team, and how much of it an untrained rep
 * puts at risk. Every input is something the buyer already knows; every constant is a published benchmark or is
 * labelled as our assumption. Runs in the browser, nothing is sent anywhere.
 */
export interface CalculatorInputs {
  reps: number;
  dialsPerDay: number;
  /** 0.07 for 7%. */
  connectRate: number;
}

export interface CalculatorConstants {
  /** Fully loaded cost of one SDR per month, salary, benefits, tools and management. */
  loadedCostPerRep: number;
  workingDays: number;
  /** Data and dialler cost spread over every dial. */
  toolingPerDial: number;
  /** Share of conversations a first-month rep mishandles. Our assumption, not a published figure. */
  mishandledShare: number;
}

export const DEFAULT_INPUTS: CalculatorInputs = { reps: 5, dialsPerDay: 60, connectRate: 0.07 };
export const DEFAULT_CONSTANTS: CalculatorConstants = { loadedCostPerRep: 8000, workingDays: 21, toolingPerDial: 0.5, mishandledShare: 0.4 };
export const INPUT_RANGES = {
  reps: { min: 1, max: 50, step: 1 },
  dialsPerDay: { min: 20, max: 200, step: 5 },
  connectRate: { min: 0.02, max: 0.25, step: 0.005 },
} as const;

/** Money above $1,000 rounds to the nearest $100; nothing shown ever exceeds $500k. */
export function roundMoney(n: number) {
  const capped = Math.min(500_000, Math.max(0, n));
  return capped > 1000 ? Math.round(capped / 100) * 100 : Math.round(capped);
}

export function calculate(i: CalculatorInputs, c: CalculatorConstants = DEFAULT_CONSTANTS, pricePerSeat = 49) {
  const dialsPerMonth = i.reps * i.dialsPerDay * c.workingDays;
  const conversations = dialsPerMonth * i.connectRate;
  const costPerDial = c.loadedCostPerRep / (i.dialsPerDay * c.workingDays) + c.toolingPerDial;
  const costPerConversation = costPerDial / i.connectRate;
  const atRisk = conversations * c.mishandledShare;
  const burned = atRisk * costPerConversation;
  const price = pricePerSeat * i.reps;
  // "Less than the cost of N wasted conversations": the price in conversations, rounded up, never below one.
  const ratio = Math.max(1, Math.ceil(price / costPerConversation));
  return {
    dialsPerMonth: Math.round(dialsPerMonth),
    conversations: Math.round(conversations),
    costPerDial,
    costPerConversation: Math.round(costPerConversation),
    atRisk: Math.round(atRisk),
    burned: roundMoney(burned),
    price,
    ratio,
    /** True when the team is too small or connects too well for the price to be less than what is at risk. */
    priceExceedsRisk: price > burned,
  };
}
