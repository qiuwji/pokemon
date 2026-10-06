/** Validates player requests and applies non-move operations. Scheduling and outcome settlement are elsewhere. */
export class BattleActions {
  constructor(battle) {
    this.battle = battle;
  }
  prepare(action, automaticSeat = null) {
    const b = this.battle;
    if (!action || typeof action !== "object")
      return { error: "无效的战斗指令。" };
    if (
      action.augment !== undefined &&
      (typeof action.augment !== "string" || !action.augment)
    )
      return { error: "无效的增强标识。" };
    if (action.augment !== undefined && action.kind !== "move")
      return { error: "增强只能用于招式行动。" };
    if (action.attachments !== undefined) {
      if (action.kind !== "move") return { error: "附加效果只能用于招式行动。" };
      if (action.augment !== undefined)
        return { error: "同一行动不能同时使用增强与附加效果。" };
      if (
        !Array.isArray(action.attachments) ||
        !action.attachments.length ||
        action.attachments.length > 2 ||
        action.attachments.some(
          (entry) =>
            !entry ||
            typeof entry.id !== "string" ||
            !entry.id ||
            (entry.parameters !== undefined &&
              typeof entry.parameters !== "string" &&
              (!entry.parameters ||
                typeof entry.parameters !== "object" ||
                Array.isArray(entry.parameters))),
        )
      )
        return { error: "无效的附加效果选择。" };
    }
    if (action.slot !== undefined && action.kind !== "item")
      return { error: "道具位置只能用于道具行动。" };
    if (action.kind === "cancel" && !automaticSeat)
      return b.decisions.pending.size
        ? { kind: "cancel", seat: b.commandSeat }
        : { error: "没有等待中的行动。" };
    const seat = automaticSeat || action.seat || b.commandSeat;
    if (
      automaticSeat
        ? action.seat !== automaticSeat || b.roster.owner(seat).kind !== "ai"
        : !b.decisions.required().some((s) => s.id === seat)
    )
      return { error: "该席位现在不能选择行动。" };
    const mon = b.roster.occupant(seat),
      owner = b.roster.owner(seat);
    const replacementRequest = b.replacements.get(seat);
    if (replacementRequest && action.kind !== "switch")
      return { error: "请先选择接替上场的伙伴。" };
    if (action.actor !== undefined && action.actor !== mon?.uid)
      return { error: "这位伙伴不能执行该行动。" };
    if (!(mon?.hp > 0) && action.kind !== "switch")
      return { error: "请选择一只还能战斗的宝可梦。" };
    const {
      augmentedMove,
      sourceMoveId,
      continuation,
      overrideMove,
      skipPP,
      skipReadiness,
      replacement,
      callDepth,
      requestedReplacement,
      forced,
      attachments,
      attachment: _forgedAttachment,
      derivedMove: _forgedDerivedMove,
      ppClear: _forgedPpClear,
      ...request
    } = action;
    const base = { ...request, seat, actor: mon?.uid ?? null };
    let prepared;
    switch (action.kind) {
      case "move": {
        const available = b
            .movesFor(seat)
            .some((m, i) => b.moveAvailable(seat, i)),
          slot =
            Number.isInteger(action.index) && b.movesFor(seat)[action.index];
        if (available && !b.moveAvailable(seat, action.index))
          return { error: "这个招式现在无法使用。" };
        const index = available ? action.index : -1,
          move =
            index < 0
              ? { effect: "recoil", target: "selected" }
              : b.db.moves[slot.id];
        if (action.augment && index < 0) return { error: "挣扎不能进行增强。" };
        // Public command input may carry parameters as a JSON string; the engine
        // always receives a plain object.
        const requested = Array.isArray(attachments)
          ? attachments.map((entry) => ({
              id: entry.id,
              parameters:
                typeof entry.parameters === "string"
                  ? JSON.parse(entry.parameters)
                  : entry.parameters ?? {},
            }))
          : [];
        if (requested.length && index < 0)
          return { error: "挣扎不能附加效果。" };
        const enhanced = action.augment
          ? b.augments.prepare({ ...base, index })
          : requested.length
            ? b.attachments.prepare({ ...base, index, attachments: requested })
            : { ...base, index };
        if (enhanced.error) return enhanced;
        const effectiveMove = enhanced.augmentedMove
          ? b.db.moves[enhanced.augmentedMove]
          : move;
        const definition = b.moveEffects.get(effectiveMove.effect);
        if (definition.supported === false) return { error: definition.reason };
        if (!b.targeting.validate(seat, effectiveMove, action.target))
          return { error: "当前行动的目标无效。" };
        prepared = enhanced;
        break;
      }
      case "form": {
        const d = b.forms.registry.definitions[action.form];
        if (
          !d ||
          d.scope !== "battle" ||
          !b.forms.canActivate(mon, action.form, owner.id)
        )
          return { error: "现在无法改变形态。" };
        prepared = base;
        break;
      }
      case "switch": {
        const permission = {
          actorSeat: seat,
          targetSeat: seat,
          forced: !(mon?.hp > 0),
          allowed: true,
        };
        if (
          !permission.forced &&
          !(
            replacementRequest &&
            b.replacements.policies[replacementRequest.reason].bypassSwitchCheck
          )
        )
          b.traits?.run("switch-check", permission);
        if (!permission.allowed) return { error: "无法离开这场战斗。" };
        if (!b.roster.canReplace(seat, action.index))
          return { error: "这只宝可梦无法替换上场。" };
        prepared = {
          ...base,
          forced: !(mon?.hp > 0),
          requestedReplacement: replacementRequest?.reason || null,
        };
        break;
      }
      case "item": {
        if (!action.item) return { error: "请选择要使用的道具。" };
        const item = action.item;
        const index = action.index ?? b.roster.seat(seat).index;
        const targetSeat = b.roster.opposing(seat)[0]?.id;
        const plan = b.items.prepare({
          id: item,
          bag: owner.bag,
          party: owner.party,
          index,
          context: "battle",
          enemy: targetSeat ? b.roster.occupant(targetSeat) : null,
          canCapture: b.rules.canCapture(b),
          slot: action.slot,
        });
        if (!plan.ok) return { error: plan.reason };
        prepared = {
          ...base,
          kind: "item",
          item,
          index,
          targetSeat,
          ...(action.slot ? { slot: structuredClone(action.slot) } : {}),
        };
        break;
      }
      case "run":
        if (!b.rules.canEscape(b)) return { error: "这场战斗无法逃跑。" };
        prepared = base;
        break;
      default:
        return { error: "无效的战斗指令。" };
    }
    const reservation = b.decisions.reservation(prepared);
    return reservation ? { error: reservation } : prepared;
  }
  switch(reference, index, { policy = null } = {}) {
    const b = this.battle,
      seat = b.seatId(reference),
      old = b.roster.occupant(seat),
      mon = b.roster.owner(seat).party[index];
    const transferred = policy
      ? Object.fromEntries(
          policy.volatileFields.map((key) => [
            key,
            structuredClone(b.conditions.get(seat)[key]),
          ]),
        )
      : {};
    b.traits?.run("leave", {
      ownerSeat: seat,
      actorSeat: seat,
      handoff: policy?.handoff || null,
    });
    b.states.clear("leave", seat, { handoff: policy?.handoff });
    b.actionLifecycle.leave(seat);
    if (old) b.forms.restore(old, "leave");
    const originalAbility = b.conditions.get(seat).originalAbility;
    if (originalAbility && old) old.ability = originalAbility;
    b.roster.replace(seat, index);
    b.conditions.reset(seat);
    Object.assign(b.conditions.get(seat), transferred);
    if (policy) b.states.handoff(seat, old.uid, policy.handoff);
    b.conditions.get(seat).entryTurn = b.turn;
    b.outcomes.enter(seat);
    b.emit(
      `${b.roster.alliance(seat) === b.homeAlliance ? "去吧，" : "对方派出了 "}${b.name(mon)}！`,
      "switch",
      {
        actorSeat: seat,
        targetSeat: seat,
        previousUid: old?.uid || null,
        handoff: policy?.handoff || null,
      },
    );
    b.traits?.run("switch-in", {
      actorSeat: seat,
      targetSeat: seat,
      ownerSeat: seat,
    });
    if (mon.hp > 0) b.traits?.enter(seat);
    b.traits?.run("replacement", {
      actorSeat: seat,
      targetSeat: seat,
      previousUid: old?.uid || null,
    });
  }
  item(action) {
    const b = this.battle,
      owner = b.roster.owner(action.seat),
      enemy = action.targetSeat ? b.roster.occupant(action.targetSeat) : null;
    const plan = b.items.prepare({
      id: action.item,
      bag: owner.bag,
      slot: action.slot,
      party: owner.party,
      index: action.index,
      context: "battle",
      enemy,
      canCapture: b.rules.canCapture(b),
    });
    if (!plan.ok || !b.items.commit(plan, owner.bag, action.item)) {
      b.emit(plan.reason || "道具条件已改变，行动取消。", "failed", {
        actorSeat: action.seat,
      });
      return;
    }
    if (plan.target) {
      b.statuses.reconcile(plan.target);
      const target = [...b.roster.seats.keys()].find(
        (id) => b.roster.occupant(id)?.uid === plan.target.uid,
      );
      b.emit(`${b.name(plan.target)} 使用了${plan.item.name}。`, "heal", {
        actorSeat: action.seat,
        ...(target
          ? { targetSeat: target }
          : { offscreen: true, targetUid: plan.target.uid }),
        targetIndex: action.index,
      });
      return;
    }
    b.emit(`投出了${plan.item.name}！`, "ball", {
      item: action.item,
      actorSeat: action.seat,
      targetSeat: action.targetSeat,
    });
    const result = b.rules.captureCheck(
      enemy,
      b.db.species[enemy.species],
      b.rng,
      b.traits?.calculate("capture-modifier", plan.captureBonus, {
        actorSeat: action.seat,
        targetSeat: action.targetSeat,
        item: action.item,
      }) ?? plan.captureBonus,
    );
    b.emit(
      result.caught
        ? `太好了！捉到了 ${b.name(enemy)}！`
        : `${"晃动…".repeat(result.shakes)}宝可梦挣脱了！`,
      "capture",
      { ...result, item: action.item, actorSeat: action.seat, targetSeat: action.targetSeat },
    );
    if (result.caught) b.finish("caught");
  }
  run(action) {
    const b = this.battle,
      mon = b.roster.occupant(action.seat),
      target = b.roster.opposing(action.seat)[0],
      enemy = target && b.roster.occupant(target.id);
    const permission = {
      actorSeat: action.seat,
      allowed: true,
      guaranteed: false,
    };
    b.traits?.run("escape-check", permission);
    if (!permission.allowed && !permission.guaranteed) {
      b.emit("无法逃跑！");
      return;
    }
    b.fleeAttempts++;
    const speed = b.speed(mon, action.seat),
      awaySpeed = enemy ? b.speed(enemy, target.id) : 0;
    const odds =
      Math.floor((speed * 128) / Math.max(1, awaySpeed)) + 30 * b.fleeAttempts;
    if (permission.guaranteed || speed >= awaySpeed || b.rng.int(256) < odds) {
      b.finish("escaped");
      b.emit("成功逃脱了！", "end", { actorSeat: action.seat });
    } else b.emit("没能逃脱！");
  }
}
