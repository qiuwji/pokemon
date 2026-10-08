/** Original ball art selection belongs to the pack; custom ball items may supply their own resource. */
export function emeraldBallResource(event) {
  const ball = event.item?.replace(/_?ball$/, "") || "poke";
  return (
    "battle-ball-" +
    (ball === "poke" ||
    [
      "great",
      "safari",
      "ultra",
      "master",
      "net",
      "dive",
      "nest",
      "repeat",
      "timer",
      "luxury",
      "premier",
    ].includes(ball)
      ? ball
      : "poke")
  );
}
