/** Existing receipt/flag policy shared by original field gifts. */
export function fieldGift(state, object) {
  const dialog = dialogue => ({ type:"dialog", dialogue });
  if (state.flags[object.receivedFlag]) return object.repeatDialogue ? [dialog(object.repeatDialogue)] : [];
  return [
    { type:"face", actor:object.id, target:"player" },
    ...(object.giftPreludeByFacing?.[state.position.dir] || []).map(command => ({ ...command, actor:object.id })),
    dialog(object.dialogue),
    { type:"reward", id:`field-gift.${object.id}`, items:{[object.itemId]:1}, onResult:{
      ok:[
        { type:"sound", cue:"emerald-audio:mus_obtain_item", channel:"fanfare" },
        { type:"waitSound", channel:"fanfare" },
        ...(object.afterDialogue ? [dialog(object.afterDialogue)] : []),
        ...(object.afterGiftFacing ? [{type:"face",actor:object.id,dir:object.afterGiftFacing}] : []),
        { type:"flag", key:object.receivedFlag, value:true },
      ],
      alreadyGranted:[{type:"flag",key:object.receivedFlag,value:true}],
      inventoryFull:[{type:"dialog",name:"",lines:["你的背包装满了，无法接收这个道具。"]}],
    } },
  ];
}
