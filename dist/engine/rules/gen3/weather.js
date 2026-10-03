/** field_weather_effect.c / battle_util.c, reference 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881. Ordinary sunshine and snow do not start battle sun/hail. */
export const GEN3_WORLD_WEATHER = {
  none: { label: "无天气" },
  clear: { label: "晴朗" },
  clouds: { label: "云影", visual: "weather.clouds" },
  rain: { label: "雨天", visual: "weather.rain", battle: "rain" },
  thunderstorm: {
    label: "雷雨",
    visual: "weather.thunderstorm",
    battle: "rain",
  },
  downpour: { label: "暴雨", visual: "weather.downpour", battle: "rain" },
  snow: { label: "飘雪", visual: "weather.snow" },
  fog: { label: "薄雾", visual: "weather.fog" },
  fog_diagonal: { label: "斜雾", visual: "weather.fog-diagonal" },
  ash: { label: "火山灰", visual: "weather.ash" },
  sand: { label: "沙暴", visual: "weather.sand", battle: "sand" },
  shade: { label: "阴影", visual: "weather.shade" },
  drought: { label: "强烈日照", visual: "weather.sun", battle: "sun" },
  underwater: { label: "水下", visual: "weather.underwater" },
  bubbles: { label: "水下气泡", visual: "weather.bubbles" },
  // Task_DoAbnormalWeather uses tDelay-- <= 0 from 600: 601 foreground frames per phase.
  abnormal: {
    label: "异常天气",
    cycle: ["downpour", "drought"],
    periodMs: (601 * 1000) / 60,
  },
  route119: {
    label: "119 号道路天气",
    cycle: ["clear", "rain", "thunderstorm", "rain"],
  },
  route123: {
    label: "123 号道路天气",
    cycle: ["clear", "clear", "rain", "clear"],
  },
};
export const GEN3_BATTLE_WEATHER = {
  rain: { visual: "weather.rain", weatherBall: "water" },
  sun: { visual: "weather.sun", weatherBall: "fire" },
  sand: {
    visual: "weather.sand",
    weatherBall: "rock",
    residual: { divisor: 16, immuneTypes: ["rock", "ground", "steel"] },
  },
  hail: {
    visual: "weather.hail",
    weatherBall: "ice",
    residual: { divisor: 16, immuneTypes: ["ice"] },
  },
};
