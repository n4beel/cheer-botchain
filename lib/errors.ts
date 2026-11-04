export function formatCheerError(err: any): string {
  const msg = err?.shortMessage || err?.message || String(err);

  if (msg.includes("BadText")) {
    return "Title must be 1–64 bytes, and goal description must be 1–200 bytes.";
  }
  if (msg.includes("BadDays")) {
    return "Streak length must be between 3 and 60 days.";
  }
  if (msg.includes("BadLead")) {
    return "Lead time must be between 1 and 14 days.";
  }
  if (msg.includes("BackingClosed")) {
    return "Backing closed when the streak began. Pledges can only be made before start day.";
  }
  if (msg.includes("AthleteCannotBack")) {
    return "You can't back your own streak.";
  }
  if (msg.includes("PledgeTooSmall")) {
    return "Pledge must be at least 0.01 BOT.";
  }
  if (msg.includes("NotAthlete")) {
    return "Only the athlete can check in for this streak.";
  }
  if (msg.includes("NotRunning")) {
    return "Streak is not currently running. Check-ins are only open on active UTC days.";
  }
  if (msg.includes("AlreadyCheckedIn")) {
    return "You have already checked in for today's UTC day.";
  }
  if (msg.includes("NothingToSettle")) {
    return "No day has been missed yet, and the streak isn't over.";
  }
  if (msg.includes("NothingToRefund")) {
    return "No refundable pledge found for your wallet.";
  }
  if (msg.includes("NothingToWithdraw")) {
    return "No pending earnings to withdraw.";
  }

  return msg;
}
