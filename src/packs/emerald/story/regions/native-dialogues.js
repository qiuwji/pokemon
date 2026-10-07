const flag = key => state => !!state.flags[key];
const any = (...keys) => state => keys.some(key => state.flags[key]);
const row = (script, variants, restore = false) => ({ script, variants, restore });
// Source branch order is retained. Later mainline facts remain separate from Woods rescue.
const rows = [
  row("RustboroCity_EventScript_FatMan", [[flag("devonGoodsStolen"),"rustboro.suspicious"],[null,"rustboro.devon"]]),
  row("RustboroCity_EventScript_Boy2", [[flag("pokenavReceived"),"rustboro.briney-peeko"],[null,"rustboro.briney-tunnel"]]),
  row("RustboroCity_EventScript_Man1", [[flag("badgeStone"),"rustboro.badge"],[null,"rustboro.gym"]]),
  row("RustboroCity_EventScript_LittleBoy", [[null,"rustboro.evolution"]], true),
  row("RustboroCity_EventScript_LittleGirl", [[null,"rustboro.shape"]], true),
  row("RustboroCity_DevonCorp_1F_EventScript_Employee", [[flag("devonGoodsReturned"),"devon1.recovered"],[flag("devonGoodsStolen"),"devon1.robber"],[null,"devon1.shoes"]]),
  row("RustboroCity_DevonCorp_1F_EventScript_StairGuard", [[flag("devonGoodsReturned"),"devon1.welcome"],[any("devonGoodsStolen","devonGoodsRecovered"),"devon1.robbed"],[null,"devon1.authorized"]]),
  row("RustboroCity_DevonCorp_1F_EventScript_Greeter", [[flag("devonGoodsReturned"),"devon1.company"],[any("devonGoodsStolen","devonGoodsRecovered"),"devon1.staff"],[null,"devon1.company"]]),
  row("RustboroCity_DevonCorp_2F_EventScript_TalkToPokemonScientist", [[null,"devon2.talking"]]),
  row("RustboroCity_DevonCorp_2F_EventScript_BallScientist", [[flag("metDevonEmployee"),"devon2.balls-ready"],[null,"devon2.balls"]]),
  row("RustboroCity_DevonCorp_2F_EventScript_PokenavScientist", [[flag("pokenavReceived"),"devon2.pokenav-owned"],[null,"devon2.pokenav"]]),
  row("RustboroCity_DevonCorp_2F_EventScript_PokemonDreamsScientist", [[null,"devon2.dreams"]]),
  row("RustboroCity_DevonCorp_2F_EventScript_MatchCallScientist", [[state => (state.flags.rustboroCityState || 0) >= 6,"devon2.next"],[null,"devon2.match-call"]]),
  row("RustboroCity_House3_EventScript_OldWoman", [[null,"rustboro.pekachu-name"]]),
  row("RustboroCity_House3_EventScript_Pekachu", [[null,"rustboro.pekachu"]]),
  row("RustboroCity_Flat2_1F_EventScript_Skitty", [[null,"rustboro.skitty"]]),
  row("DewfordTown_House1_EventScript_Zigzagoon", [[null,"dewford.zigzagoon"]]),
];

export const NATIVE_DIALOGUE_EVENTS = rows.map(({ script, variants, restore }, index) => ({
  id:`native.dialogue.${index}`, trigger:"interact", priority:10, selector:{kind:"talk",script},
  build:(state,{object}) => {
    const key = variants.find(([when]) => !when || when(state))[1];
    return [
      {type:"face",actor:object.id,target:"player"},
      {type:"dialog",dialogue:`emerald:native-interactions.${key}`},
      ...(restore ? [{type:"face",actor:object.id,dir:object.dir}] : []),
    ];
  },
}));
