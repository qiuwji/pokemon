import { manifest } from "../../helpers/session.js";
/** Test-only battle attachment: a pre-order form change with one use per controller. */
export const attachmentFixture = manifest("fixture-attachment", (api) => {
  const form = api.content.register("forms", "stance", {
    species: "mudkip",
    name: "测试姿态",
    scope: "battle",
    baseStats: { spe: 200 },
    oncePerController: true,
    clearOn: ["leave", "faint"],
  });
  api.content.register("battleAttachments", "brace", {
    name: "战术姿态",
    commitPoint: "beforeOrder",
    limit: { scope: "controller", max: 1 },
    transition: { form },
  });
});
