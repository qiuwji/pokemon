/** Gen III experience shares: participants and EXP SHARE each receive half-pools when a holder exists. */
export function experienceDistribution({
  party,
  participants,
  total,
  isShare = () => false,
}) {
  const eligible = party.filter((m) => m.hp > 0 && !m.egg),
    sent = eligible.filter((m) => participants.has(m.uid)),
    holders = eligible.filter(isShare);
  const split = holders.length > 0,
    portion = split ? Math.floor(total / 2) : total;
  return eligible
    .map((mon) => ({
      mon,
      amount:
        (participants.has(mon.uid)
          ? Math.max(1, Math.floor(portion / Math.max(1, sent.length)))
          : 0) +
        (isShare(mon) ? Math.max(1, Math.floor(portion / holders.length)) : 0),
    }))
    .filter((r) => r.amount > 0 && r.mon.level < 100);
}
