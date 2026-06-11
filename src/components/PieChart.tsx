import { CategoryStat } from '@/types';
import { CATEGORY_CHART_COLORS, CATEGORY_CONFIG } from '@/constants';

interface PieChartProps {
  data: CategoryStat[];
  size?: number;
}

export default function PieChart({ data, size = 200 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-100"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-400 text-sm">暂无数据</span>
      </div>
    );
  }

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
    return [x, y];
  };

  const paths = data.map((item) => {
    const percent = item.amount / total;
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    cumulativePercent += percent;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'L 0 0',
    ].join(' ');
    return {
      d: pathData,
      color: CATEGORY_CHART_COLORS[item.category],
      label: CATEGORY_CONFIG[item.category].label,
      amount: item.amount,
      percent: (percent * 100).toFixed(1),
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg
        viewBox="-1.2 -1.2 2.4 2.4"
        style={{ width: size, height: size }}
        className="shrink-0"
      >
        {paths.length === 1 ? (
          <circle cx="0" cy="0" r="1" fill={paths[0].color} />
        ) : (
          paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)
        )}
        <circle cx="0" cy="0" r="0.55" fill="white" />
      </svg>
      <div className="flex flex-col gap-2">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-700 w-12">{p.label}</span>
            <span className="text-gray-500 w-14 text-right">{p.percent}%</span>
            <span className="text-gray-800 font-medium">
              ¥{p.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
