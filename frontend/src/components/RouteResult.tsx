import { Button, Skeleton } from "antd";
import {
  ArrowLeftRight,
  CarTaxiFront,
  CircleAlert,
  Clock,
  Flag,
  Footprints,
  Lightbulb,
  MapPin,
  Route as RouteIcon,
  TrainFront,
} from "lucide-react";
import { useMemo } from "react";
import { nearestNodes } from "@/lib/geo";
import { buildItinerary, formatDistance, formatDuration, type ItinerarySegment, type SegmentMode } from "@/lib/itinerary";
import { useTravelStore, type PathResult } from "@/stores/useTravelStore";

const MODE_ICON: Record<SegmentMode, typeof Footprints> = {
  walk: Footprints,
  transit: TrainFront,
  taxi: CarTaxiFront,
};

const MODE_BADGE_CLASS: Record<SegmentMode, string> = {
  walk: "bg-emerald-50 text-emerald-700",
  transit: "bg-violet-50 text-violet-700",
  taxi: "bg-amber-50 text-amber-700",
};

export default function RouteResult() {
  const route = useTravelStore((s) => s.route);
  const routeLoading = useTravelStore((s) => s.routeLoading);
  const routeError = useTravelStore((s) => s.routeError);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">行程建议</div>
        {route ? (
          <div className="text-xs text-slate-500">全程 {formatDistance(route.totalDistanceMeters)}</div>
        ) : null}
      </div>

      {routeLoading ? (
        <div className="mt-3">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ) : routeError?.code === "unreachable" ? (
        <UnreachableResult message={routeError.message} />
      ) : route ? (
        <ItineraryView route={route} />
      ) : (
        <div className="mt-3 text-sm text-slate-600">选择起点与终点后开始规划。</div>
      )}
    </>
  );
}

function ItineraryView({ route }: { route: PathResult }) {
  const itinerary = useMemo(() => buildItinerary(route), [route]);
  const start = route.pathNodes[0];
  const end = route.pathNodes[route.pathNodes.length - 1];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          <RouteIcon className="h-3 w-3" />
          全程 {formatDistance(itinerary.totalDistanceMeters)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
          <Clock className="h-3 w-3" />
          预计 {formatDuration(itinerary.totalDurationMinutes)}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          途经 {route.pathNodes.length} 站 · {itinerary.segments.length} 段行程
        </span>
      </div>

      <div className="relative mt-4">
        <div className="absolute bottom-3 left-[9px] top-3 w-px bg-slate-200" />

        <EndpointRow
          tone="start"
          label="出发"
          name={start?.name ?? ""}
          type={start?.type}
        />

        {itinerary.segments.map((seg) => (
          <SegmentRow key={seg.index} segment={seg} />
        ))}

        <EndpointRow
          tone="end"
          label="到达终点"
          name={end?.name ?? ""}
          type={end?.type}
        />
      </div>
    </div>
  );
}

function EndpointRow({ tone, label, name, type }: { tone: "start" | "end"; label: string; name: string; type?: string }) {
  const isStart = tone === "start";
  return (
    <div className="relative flex items-start gap-3 py-1.5">
      <span
        className={`relative z-10 mt-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white shadow ${
          isStart ? "bg-emerald-600" : "bg-red-600"
        }`}
      >
        {isStart ? <MapPin className="h-2.5 w-2.5 text-white" /> : <Flag className="h-2.5 w-2.5 text-white" />}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">
          <span className="mr-1 text-xs text-slate-500">{label}</span>
          {name}
        </div>
        {type ? <div className="mt-0.5 text-xs text-slate-500">{type}</div> : null}
      </div>
    </div>
  );
}

function SegmentRow({ segment }: { segment: ItinerarySegment }) {
  const Icon = MODE_ICON[segment.mode];
  return (
    <div className="relative flex items-start gap-3 py-1.5">
      <span className="relative z-10 mt-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
        <Icon className="h-4 w-4 text-slate-500" />
      </span>
      <div className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-slate-900">{segment.title}</div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${MODE_BADGE_CLASS[segment.mode]}`}>
            {segment.modeLabel}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {formatDistance(segment.distanceMeters)} · {formatDuration(segment.durationMinutes)}
        </div>
        {segment.tips.length > 0 ? (
          <div className="mt-2 rounded-md bg-amber-50/70 p-2">
            <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
              <Lightbulb className="h-3 w-3" />
              注意事项
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-800">
              {segment.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UnreachableResult({ message }: { message: string }) {
  const nodes = useTravelStore((s) => s.nodes);
  const startId = useTravelStore((s) => s.startId);
  const endId = useTravelStore((s) => s.endId);
  const setStartId = useTravelStore((s) => s.setStartId);
  const setEndId = useTravelStore((s) => s.setEndId);
  const swap = useTravelStore((s) => s.swap);
  const fetchRoute = useTravelStore((s) => s.fetchRoute);

  const startNode = nodes.find((n) => n.id === startId);
  const endNode = nodes.find((n) => n.id === endId);

  const altStarts = useMemo(() => nearestNodes(nodes, startId, [startId, endId]), [nodes, startId, endId]);
  const altEnds = useMemo(() => nearestNodes(nodes, endId, [startId, endId]), [nodes, startId, endId]);

  const retry = (apply: () => void) => {
    apply();
    void fetchRoute();
  };

  return (
    <div className="mt-3">
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
          <CircleAlert className="h-4 w-4" />
          暂未找到可达路线
        </div>
        <div className="mt-1 text-xs text-orange-700">
          {startNode?.name ?? "起点"} → {endNode?.name ?? "终点"}：{message || "当前路网中两点之间没有可通行的路线。"}
        </div>
      </div>

      <div className="mt-3 text-xs font-medium text-slate-700">你可以这样调整：</div>

      <div className="mt-2 space-y-3">
        <Button
          block
          size="small"
          icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          onClick={() => retry(swap)}
        >
          交换起点与终点后重试
        </Button>

        {altStarts.length > 0 ? (
          <div>
            <div className="text-xs text-slate-500">或换一个起点（离「{startNode?.name}」较近）：</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {altStarts.map(({ node, distanceMeters }) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => retry(() => setStartId(node.id))}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {node.name}
                  <span className="ml-1 text-slate-400">{formatDistance(distanceMeters)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {altEnds.length > 0 ? (
          <div>
            <div className="text-xs text-slate-500">或换一个终点（离「{endNode?.name}」较近）：</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {altEnds.map(({ node, distanceMeters }) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => retry(() => setEndId(node.id))}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {node.name}
                  <span className="ml-1 text-slate-400">{formatDistance(distanceMeters)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
