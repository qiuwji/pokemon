import { Random } from "../../../../engine/model.js";

// Route104_PrettyPetalFlowerShop/scripts.inc and data/text/berries.inc.
const say = (name, ...lines) => ({ type:"dialog",name,lines });
const owner = "花店店主", sister = "花店姐姐", girl = "花店妹妹";
const explanation = say(owner,
  "树果树只会生长在柔软肥沃的土壤里。摘下树果后，记得再种下一颗。",
  "种下的树果会发芽、长大、开出美丽的花，然后再次结出树果。",
  "我的梦想是让全世界开满美丽的花。请你也帮忙种树果，让世界多一些花吧！");
const pailExplanation = say(sister,
  "树果树生长时，可以用吼吼鲸喷壶给它浇水。",
  "还有啊，成熟的树果一直不摘就会掉在地上，不过之后还会重新发芽。它们的生命力很强呢！");
const candy = say(girl,
  "树果可以种下长成大树，也可以让宝可梦携带。",
  "现在还有一种机器，能把不同树果混合起来，做成给宝可梦吃的糖果。",
  "我也想尝尝那种糖果！");
const sound = [{type:"sound",cue:"emerald-audio:mus_obtain_item",channel:"fanfare"},{type:"waitSound",channel:"fanfare"}];
const berryItems = ["cheri_berry","chesto_berry","pecha_berry","rawst_berry","aspear_berry","leppa_berry","oran_berry","persim_berry"];
export const FLOWER_SHOP_EVENTS = [
  {
    id:"flower-shop.owner", trigger:"interact",priority:10,selector:{kind:"flowerShopOwner"},
    build: state => [say(owner,"你好！这里是漂亮花瓣花店，我们希望鲜花开遍全世界！"),
      ...(!state.flags.prettyPetalOwnerMet ? [{type:"flag",key:"prettyPetalOwnerMet",value:true},say(owner,`你叫什么名字？……${state.playerName}，真是个好名字。`)] : []),
      {type:"choice",name:owner,prompt:`${state.playerName}，想了解一下树果吗？`,cancel:"no",options:[
        {id:"yes",label:"想",commands:[explanation]},
        {id:"no",label:"不想",commands:[say(owner,"鲜花能带给大家很多快乐，你说是不是？")]},
      ]}],
  },
  {
    id:"flower-shop.pail",trigger:"interact",priority:10,selector:{kind:"flowerShopPail"},
    build: state => state.flags.wailmerPail ? [pailExplanation] : [
      say(sister,"你好！越用心照顾花，花就会开得越美。","你一定也会喜欢照顾花的，这个送给你！"),
      {type:"reward",id:"flower-shop.wailmer-pail",items:{wailmer_pail:1},flags:{wailmerPail:true},onResult:{
        ok:[...sound,pailExplanation],alreadyGranted:[{type:"flag",key:"wailmerPail",value:true},pailExplanation],
        inventoryFull:[say(sister,"背包已经装满了，腾出位置再来拿喷壶吧。")],
      }},
    ],
  },
  {
    id:"flower-shop.berry",trigger:"interact",priority:10,selector:{kind:"flowerShopBerry"},
    build: state => {
      const day = Math.floor(state.clock.localMs / 86400000), id=`flower-shop.berry.day.${day}`;
      if (state.story.rewards.includes(id)) return [candy];
      // Saved world seed + RTC day gives a replayable uniform selection without using ambient NPC RNG.
      const item=berryItems[new Random((state.randomSeed + day) >>> 0).int(8)];
      return [say(girl,"我也想像姐姐们一样，所以也在种花！","这个送给你！"),
        {type:"reward",id,items:{[item]:1},onResult:{ok:[...sound,candy],alreadyGranted:[candy],inventoryFull:[say(girl,"背包装满了，腾出位置再来拿树果吧。")]}},
      ];
    },
  },
];
