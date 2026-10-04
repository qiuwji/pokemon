import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("bundle registers an NPC, shared dialogue and choice with durable reward", async () => {
  const plugin = manifest("story-bundle", api => {
    api.content.register("mapExtensions", "guide", { map: "LittlerootTown",
      elements: [{id:"story-bundle:guide",x:8,y:9,actor:"Boy1",dir:"down",
        kind:"talk",name:"向导",text:"",movement:{mode:"still",rangeX:0,rangeY:0}}] });
    api.story.registerBundle("village", {version:1,
      dialogues:{hello:{name:"向导",bindings:{who:{query:{id:"playerName"}}},
        lines:[{name:"向导",text:"欢迎，{{who}}！"},{name:"助手",text:"领取旅行礼物吗？"}]}},
      scripts:{hello:{parameters:objectSchema(),commands:[{type:"dialog",dialogue:"hello"}]},
        gift:{commands:[{type:"call",script:"hello"},
          {type:"choice",name:"向导",prompt:"请选择",cancel:"leave",options:[
            {id:"yes",label:"领取",commands:[{type:"reward",id:"story-bundle:gift",money:20}]},
            {id:"leave",label:"离开",commands:[]}]}]}},
      entries:{guide:{trigger:"interact",selector:{objectId:"story-bundle:guide"},script:"gift"}},
    });
  });
  const s=session([plugin]), before=s.game.state.money;
  s.game.enter({map:"LittlerootTown",x:8,y:10,dir:"up"});
  s.game.interact(); await s.settle();
  assert.equal(s.game.state.money,before+20);
  assert.equal(s.game.dialogueHistory()[0].lines[1].name,"助手");
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.dialogueHistory().length,2);
});
