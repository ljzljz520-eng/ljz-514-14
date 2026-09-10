import type { PathResult, TravelNode } from "@/stores/useTravelStore";

export type SegmentMode = "walk" | "transit" | "taxi";

export type ItinerarySegment = {
  index: number;
  from: TravelNode;
  to: TravelNode;
  distanceMeters: number;
  mode: SegmentMode;
  modeLabel: string;
  /** 例如：从洪崖洞步行至索道入口 */
  title: string;
  durationMinutes: number;
  /** 本段注意事项 */
  tips: string[];
};

export type Itinerary = {
  segments: ItinerarySegment[];
  totalDistanceMeters: number;
  totalDurationMinutes: number;
};

/** 步行上限：1.2 km 以内建议步行 */
const WALK_MAX_METERS = 1200;
/** 打车上限：8 km 以内建议打车，更远优先轨道交通 */
const TAXI_MAX_METERS = 8000;

const WALK_METERS_PER_MIN = 4500 / 60; // 步行约 4.5 km/h（山城坡多，取保守值）
const TAXI_METERS_PER_MIN = 28000 / 60; // 城区车行约 28 km/h
const TRANSIT_METERS_PER_MIN = 30000 / 60; // 轨道交通旅行速度约 30 km/h
const TAXI_WAIT_MINUTES = 5; // 叫车/等车
const TRANSIT_WAIT_MINUTES = 8; // 进出站 + 候车

const TRANSIT_TYPE_KEYWORDS = ["轻轨", "地铁", "轨道", "车站", "索道"];

const MODE_LABEL: Record<SegmentMode, string> = {
  walk: "步行",
  transit: "轨道交通",
  taxi: "打车/网约车",
};

const MODE_VERB: Record<SegmentMode, string> = {
  walk: "步行至",
  transit: "乘坐轨道交通至",
  taxi: "打车至",
};

function isTransitNode(node: TravelNode | undefined): boolean {
  const t = node?.type ?? "";
  return TRANSIT_TYPE_KEYWORDS.some((k) => t.includes(k));
}

/** 根据分段距离与起终点类型推断出行方式 */
export function inferMode(from: TravelNode, to: TravelNode, distanceMeters: number): SegmentMode {
  if (distanceMeters <= WALK_MAX_METERS) return "walk";
  if (isTransitNode(from) || isTransitNode(to)) return "transit";
  if (distanceMeters <= TAXI_MAX_METERS) return "taxi";
  return "transit";
}

function estimateMinutes(mode: SegmentMode, distanceMeters: number): number {
  switch (mode) {
    case "walk":
      return Math.max(2, Math.round(distanceMeters / WALK_METERS_PER_MIN));
    case "taxi":
      return Math.max(5, Math.round(distanceMeters / TAXI_METERS_PER_MIN + TAXI_WAIT_MINUTES));
    case "transit":
      return Math.max(8, Math.round(distanceMeters / TRANSIT_METERS_PER_MIN + TRANSIT_WAIT_MINUTES));
  }
}

const MODE_TIPS: Record<SegmentMode, string[]> = {
  walk: ["重庆多坡道台阶，建议穿舒适防滑的鞋"],
  transit: ["留意轨道首末班车时间，高峰时段较为拥挤"],
  taxi: ["高峰时段（7:30–9:30、17:00–19:30）易拥堵，请预留时间"],
};

/** 按目的地类型给出的温馨提示 */
const TYPE_TIPS: Array<[keyword: string, tip: string]> = [
  ["轻轨", "穿楼观景平台在站外，可预留拍照时间"],
  ["索道", "索道轿厢容量有限，旺季建议提前线上购票"],
  ["景区", "热门景区客流较大，建议提前预约并保管好随身物品"],
  ["博物馆", "博物馆通常周一闭馆，建议提前在官方渠道预约"],
  ["古城", "老街多为石板路与台阶，注意脚下安全"],
  ["公园", "留意园区开放时间，注意防晒补水"],
  ["地标", "商圈人流密集，建议错峰出行"],
  ["建筑", "外观拍照时注意来往车辆与人流"],
  ["自然", "山区温差较大，建议备一件外套"],
];

function buildTips(mode: SegmentMode, to: TravelNode, distanceMeters: number): string[] {
  const tips: string[] = [...MODE_TIPS[mode]];
  if (mode === "walk" && distanceMeters >= 800) {
    tips.push("步行距离较长，途中注意补水");
  }
  const typeTip = TYPE_TIPS.find(([k]) => (to.type ?? "").includes(k));
  if (typeTip) tips.push(typeTip[1]);
  return Array.from(new Set(tips)).slice(0, 3);
}

/** 把路径结果转成“旅行助手”式的分段行程说明 */
export function buildItinerary(route: PathResult): Itinerary {
  const nodes = route.pathNodes;
  const segments: ItinerarySegment[] = [];

  for (let i = 1; i < nodes.length; i++) {
    const from = nodes[i - 1];
    const to = nodes[i];
    const distanceMeters = route.segmentDistanceMeters[i - 1] ?? 0;
    const mode = inferMode(from, to, distanceMeters);
    segments.push({
      index: i,
      from,
      to,
      distanceMeters,
      mode,
      modeLabel: MODE_LABEL[mode],
      title: `从${from.name}${MODE_VERB[mode]}${to.name}`,
      durationMinutes: estimateMinutes(mode, distanceMeters),
      tips: buildTips(mode, to, distanceMeters),
    });
  }

  const totalDurationMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  return { segments, totalDistanceMeters: route.totalDistanceMeters, totalDurationMinutes };
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "-";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "-";
  if (minutes < 60) return `约 ${Math.round(minutes)} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `约 ${h} 小时` : `约 ${h} 小时 ${m} 分钟`;
}
