import type { TravelNode } from "@/stores/useTravelStore";

const EARTH_RADIUS_METERS = 6371000;

/** 两点经纬度的球面直线距离（米） */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(s));
}

export type NearbyNode = {
  node: TravelNode;
  distanceMeters: number;
};

/** 找到离 targetId 直线距离最近的若干个候选节点（用于无可达路线时推荐换起点/终点） */
export function nearestNodes(
  nodes: TravelNode[],
  targetId: string | undefined,
  excludeIds: Array<string | undefined>,
  limit = 3,
): NearbyNode[] {
  const target = nodes.find((n) => n.id === targetId);
  if (!target) return [];
  const excluded = new Set(excludeIds.filter(Boolean) as string[]);
  return nodes
    .filter((n) => n.id !== target.id && !excluded.has(n.id))
    .map((n) => ({ node: n, distanceMeters: haversineMeters(target, n) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}
