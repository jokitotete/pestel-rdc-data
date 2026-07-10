import React from 'react';
import { Text, View, TouchableOpacity, Linking } from 'react-native';
import Svg, { Rect, Circle, Line, Polyline, G, Text as SvgText } from 'react-native-svg';
import { C, F, AX } from './theme';
import { Icon } from './ui';

// Résolveur de couleurs : les données du portail utilisent des var(--…) CSS inexistantes en RN.
const TOKENS = {
  '--ax-P': AX.P, '--ax-E': AX.E, '--ax-S': AX.S, '--ax-T': AX.T, '--ax-Env': AX.Env, '--ax-L': AX.L,
  '--alert': C.alert, '--gold': C.gold, '--cobalt': C.cobalt, '--ok': C.ok,
};
export const resolveColor = (col, fallback = C.cobalt) => {
  if (!col) return fallback;
  const m = /var\(\s*(--[\w-]+)\s*\)/.exec(col);
  if (m) return TOKENS[m[1]] || fallback;
  return col; // hex direct
};
const PALETTE = [C.cobalt, AX.T, AX.E, AX.Env, AX.S, AX.L, C.alert, AX.P];
const fmtNum = (v) => {
  const n = Number(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString('fr-FR').replace(/ |,/g, ' ');
  return String(v).replace('.', ',');
};

// ---- Graphe en barres verticales ----
function BarChart({ data, unit = '', width, height = 150 }) {
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  const w = width, h = height;
  const max = Math.max(...data.map((d) => d.value)) * 1.12 || 1;
  const bw = (w - pad.l - pad.r) / data.length;
  const barW = Math.min(bw * 0.55, 54);
  const scaleY = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  return (
    <Svg width={w} height={h}>
      <Line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} stroke={C.border} strokeWidth={1} />
      {data.map((d, i) => {
        const x = pad.l + i * bw + (bw - barW) / 2;
        const y = scaleY(d.value);
        const col = d.highlight ? C.cobalt : resolveColor(d.color, AX.E);
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={h - pad.b - y} rx={4} fill={col} opacity={d.highlight ? 1 : 0.82} />
            <SvgText x={x + barW / 2} y={y - 6} fontSize={11} fontFamily={F.monoSemi} fill={C.ink} textAnchor="middle">
              {fmtNum(d.value)}
            </SvgText>
            <SvgText x={x + barW / 2} y={h - pad.b + 15} fontSize={10} fontFamily={F.mono} fill={C.inkMut} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        );
      })}
      {unit ? <SvgText x={w - pad.r} y={14} fontSize={10} fontFamily={F.mono} fill={C.inkMut} textAnchor="end">{unit.trim()}</SvgText> : null}
    </Svg>
  );
}

// ---- Graphe en courbes (multi-séries) ----
function LineChart({ labels, series, width, height = 160 }) {
  const pad = { l: 10, r: 12, t: 16, b: 26 };
  const w = width, h = height;
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const n = labels.length;
  const x = (i) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
  return (
    <Svg width={w} height={h}>
      {[0, 0.5, 1].map((t, i) => (
        <Line key={i} x1={pad.l} y1={pad.t + t * (h - pad.t - pad.b)} x2={w - pad.r} y2={pad.t + t * (h - pad.t - pad.b)} stroke={C.border2} strokeWidth={1} />
      ))}
      {series.map((s, si) => {
        const col = resolveColor(s.color, PALETTE[si % PALETTE.length]);
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
        return (
          <G key={si}>
            <Polyline points={pts} fill="none" stroke={col} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={3.2} fill={C.panel} stroke={col} strokeWidth={2} />)}
          </G>
        );
      })}
      {labels.map((l, i) => (
        (i === 0 || i === n - 1 || n <= 4) ? (
          <SvgText key={i} x={x(i)} y={h - 8} fontSize={9.5} fontFamily={F.mono} fill={C.inkMut} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</SvgText>
        ) : null
      ))}
    </Svg>
  );
}

// ---- Anneau (donut) avec légende ----
function DonutChart({ data, centerV, centerL, width }) {
  const size = 130, r = 52, cx = size / 2, cy = size / 2, sw = 20;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle cx={cx} cy={cy} r={r} stroke={C.border2} strokeWidth={sw} fill="none" />
          {data.map((d, i) => {
            const frac = d.value / total;
            const col = resolveColor(d.color, PALETTE[i % PALETTE.length]);
            const seg = (
              <Circle key={i} cx={cx} cy={cy} r={r} stroke={col} strokeWidth={sw} fill="none"
                strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ} strokeLinecap="butt" />
            );
            acc += frac;
            return seg;
          })}
        </G>
        {centerV != null ? <SvgText x={cx} y={cy - 1} fontSize={18} fontFamily={F.displayBold} fill={C.ink} textAnchor="middle">{centerV}</SvgText> : null}
        {centerL ? <SvgText x={cx} y={cy + 14} fontSize={9} fontFamily={F.mono} fill={C.inkMut} textAnchor="middle">{centerL}</SvgText> : null}
      </Svg>
      <View style={{ flex: 1, gap: 5 }}>
        {data.map((d, i) => {
          const col = resolveColor(d.color, PALETTE[i % PALETTE.length]);
          const pct = Math.round((d.value / total) * 100);
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: col }} />
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.inkDim, flex: 1 }} numberOfLines={1}>{d.label}</Text>
              <Text style={{ fontFamily: F.monoSemi, fontSize: 11.5, color: C.ink }}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---- Carte-graphe : titre, note, graphe, source ----
export function ChartCard({ trend, width }) {
  const inner = width - 28; // padding interne de la carte
  return (
    <View style={{ backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.ink }}>{trend.title}</Text>
      {trend.note ? <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.inkMut, marginTop: 3, marginBottom: 10, lineHeight: 16 }}>{trend.note}</Text> : <View style={{ height: 10 }} />}
      {trend.type === 'bar' && <BarChart data={trend.data} unit={trend.unit} width={inner} />}
      {trend.type === 'line' && <LineChart labels={trend.labels} series={trend.series} width={inner} />}
      {trend.type === 'donut' && <DonutChart data={trend.data} centerV={trend.centerV} centerL={trend.centerL} width={inner} />}
      {trend.src && trend.src.u ? (
        <TouchableOpacity onPress={() => Linking.openURL(trend.src.u)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 10 }}>
          <Icon name="link" size={11} color={C.cobalt} />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.cobalt }}>{trend.src.n || 'source'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
