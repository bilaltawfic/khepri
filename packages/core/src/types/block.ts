// ==== Block Planning Types ====

/** A date when the athlete is unavailable, with an optional reason. */
export interface UnavailableDate {
  readonly date: string; // YYYY-MM-DD
  readonly reason?: string;
}
