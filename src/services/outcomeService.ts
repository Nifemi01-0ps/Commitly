/**
 * outcomeService.ts
 *
 * Centralized business logic for calculating plan outcomes and credit changes.
 * UI and stores should never calculate rewards/penalties themselves.
 */

export interface OutcomeResult {
  delta: number;        // Net credit change (+ = earned, - = lost)
  message: string;
  details: {
    stakeAmount: number;
    returned: number;   // Stake returned to user
    bonus: number;      // Extra earned
    lost: number;       // Stake permanently lost
  };
}

export interface GroupParticipant {
  userId: string;
  stake: number;
  completed: boolean;
}

export interface GroupOutcome {
  perUser: Record<string, OutcomeResult>;
  totalPool: number;
  winnerCount: number;
  allFailed: boolean;
}

// ─── Solo Plan Outcomes ────

export function calcSoloOutcome(
  stakeAmount: number,
  success: boolean
): OutcomeResult {
  if (stakeAmount <= 0) {
    return {
      delta: 0,
      message: success ? "Plan completed" : "Plan missed",
      details: { stakeAmount: 0, returned: 0, bonus: 0, lost: 0 },
    };
  }

  if (success) {
    const bonus = Math.floor(stakeAmount * 0.2); // 20% bonus
    const delta = stakeAmount + bonus;

    return {
      delta,
      message: `+${delta} credits returned (includes +${bonus} bonus)`,
      details: {
        stakeAmount,
        returned: stakeAmount,
        bonus,
        lost: 0,
      },
    };
  } else {
    return {
      delta: -stakeAmount,
      message: `You lost ${stakeAmount} credits for missing the deadline`,
      details: {
        stakeAmount,
        returned: 0,
        bonus: 0,
        lost: stakeAmount,
      },
    };
  }
}

// ─── Group Plan Outcomes ─────

export function calcGroupOutcomes(participants: GroupParticipant[]): GroupOutcome {
  if (participants.length === 0) {
    return { perUser: {}, totalPool: 0, winnerCount: 0, allFailed: true };
  }

  const totalPool = participants.reduce((sum, p) => sum + p.stake, 0);
  const winners = participants.filter((p) => p.completed);
  const winnerCount = winners.length;
  const allFailed = winnerCount === 0;

  const perUser: Record<string, OutcomeResult> = {};

  if (allFailed) {
    for (const p of participants) {
      perUser[p.userId] = {
        delta: -p.stake,
        message: `You lost ${p.stake} credits — everyone missed this plan`,
        details: { stakeAmount: p.stake, returned: 0, bonus: 0, lost: p.stake },
      };
    }
  } else {
    // Winners split the entire pool equally
    const sharePerWinner = Math.floor(totalPool / winnerCount);

    for (const p of participants) {
      if (p.completed) {
        const delta = sharePerWinner; // They get their share (includes their own stake + others')
        const bonus = Math.max(0, delta - p.stake);

        perUser[p.userId] = {
          delta,
          message: `You earned +${delta} credits (${bonus} bonus from others)`,
          details: {
            stakeAmount: p.stake,
            returned: p.stake,
            bonus,
            lost: 0,
          },
        };
      } else {
        perUser[p.userId] = {
          delta: -p.stake,
          message: `You lost ${p.stake} credits — not enough people completed`,
          details: { stakeAmount: p.stake, returned: 0, bonus: 0, lost: p.stake },
        };
      }
    }
  }

  return { perUser, totalPool, winnerCount, allFailed };
}

// ─── UI Formatting Helpers ────

export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta} credits`;
  if (delta < 0) return `${delta} credits`;
  return "No change";
}

export function formatPool(stakePerPerson: number, participantCount: number): string {
  if (participantCount <= 1) return `${stakePerPerson} credits committed`;
  const total = stakePerPerson * participantCount;
  return `${stakePerPerson} per person • ${total} total pool`;
}