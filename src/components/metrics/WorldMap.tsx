import { useState, useMemo, HTMLAttributes } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import classNames from 'classnames';
import { colord } from 'colord';
import HoverTooltip from '@/components/common/HoverTooltip';
import { ISO_COUNTRIES, MAP_FILE } from '@/lib/constants';
import { useDateRange, useTheme, useWebsiteMetrics } from '@/components/hooks';
import { useCountryNames } from '@/components/hooks';
import { useLocale } from '@/components/hooks';
import { useMessages } from '@/components/hooks';
import { formatLongNumber } from '@/lib/format';
import { percentFilter } from '@/lib/filters';
import styles from './WorldMap.module.css';

// 定义中国区域包含的地区
const CHINA_REGIONS = ['CN', 'TW', 'HK', 'MO'];

export function WorldMap({
  websiteId,
  data,
  className,
  ...props
}: {
  websiteId?: string;
  data?: any[];
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const [tooltip, setTooltipPopup] = useState();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const { theme, colors } = useTheme();
  const { locale } = useLocale();
  const { formatMessage, labels } = useMessages();
  const { countryNames } = useCountryNames(locale);
  const visitorsLabel = formatMessage(labels.visitors).toLocaleLowerCase(locale);
  const unknownLabel = formatMessage(labels.unknown);
  const {
    dateRange: { startDate, endDate },
  } = useDateRange(websiteId);
  const { data: mapData } = useWebsiteMetrics(websiteId, {
    type: 'country',
    startAt: +startDate,
    endAt: +endDate,
  });
  const metrics = useMemo(
    () => (data || mapData ? percentFilter((data || mapData) as any[]) : []),
    [data, mapData],
  );

  const getFillColor = (code: string) => {
    if (code === 'AQ') return;
    // 如果悬停在中国区域，让所有中国区域都高亮
    if (hoveredRegion && CHINA_REGIONS.includes(hoveredRegion) && CHINA_REGIONS.includes(code)) {
      return colors.map.hoverColor;
    }
    const country = metrics?.find(({ x }) => x === code);
    if (!country) {
      return colors.map.fillColor;
    }
    return colord(colors.map.baseColor)
      [theme === 'light' ? 'lighten' : 'darken'](0.4 * (1.0 - country.z / 100))
      .toHex();
  };

  const getOpacity = (code: string) => {
    return code === 'AQ' ? 0 : 1;
  };

  const handleHover = (code: string) => {
    if (code === 'AQ') return;

    setHoveredRegion(code);

    // 如果悬停在中国区域，显示所有中国地区的数据
    if (CHINA_REGIONS.includes(code)) {
      const chinaData = CHINA_REGIONS.map(region => {
        const country = metrics?.find(({ x }) => x === region);
        return {
          name: countryNames[region] || unknownLabel,
          visitors: country?.y || 0,
        };
      });

      const totalVisitors = chinaData.reduce((sum, item) => sum + item.visitors, 0);
      const regionNames = chinaData
        .filter(item => item.visitors > 0)
        .map(item => `${item.name}: ${formatLongNumber(item.visitors)}`)
        .join(', ');

      if (totalVisitors > 0) {
        setTooltipPopup(
          `中国地区: ${formatLongNumber(totalVisitors)} ${visitorsLabel} (${regionNames})` as any,
        );
      } else {
        setTooltipPopup(
          `${countryNames[code] || unknownLabel}: ${formatLongNumber(0)} ${visitorsLabel}` as any,
        );
      }
    } else {
      const country = metrics?.find(({ x }) => x === code);
      setTooltipPopup(
        `${countryNames[code] || unknownLabel}: ${formatLongNumber(
          country?.y || 0,
        )} ${visitorsLabel}` as any,
      );
    }
  };

  const handleMouseOut = () => {
    setTooltipPopup(null);
    setHoveredRegion(null);
  };

  return (
    <div
      {...props}
      className={classNames(styles.container, className)}
      data-tip=""
      data-for="world-map-tooltip"
    >
      <ComposableMap projection="geoMercator">
        <ZoomableGroup zoom={0.8} minZoom={0.7} center={[0, 40]}>
          <Geographies geography={`${process.env.basePath || ''}${MAP_FILE}`}>
            {({ geographies }) => {
              return geographies.map(geo => {
                const code = ISO_COUNTRIES[geo.id];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(code)}
                    stroke={colors.map.strokeColor}
                    opacity={getOpacity(code)}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: getFillColor(code) },
                      pressed: { outline: 'none' },
                    }}
                    onMouseOver={() => handleHover(code)}
                    onMouseOut={handleMouseOut}
                  />
                );
              });
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && <HoverTooltip>{tooltip}</HoverTooltip>}
    </div>
  );
}

export default WorldMap;
