import React from 'react';
import { Text, View, TouchableOpacity, Linking } from 'react-native';
import Svg, { Rect, Circle, Line, Polyline, G } from 'react-native-svg';
import { C, F, AX } from './theme';
import { Icon } from './ui';

// NB : on n'utilise PAS <Text> de react-native-svg (invisible avec police custom).
// Toutes les étiquettes sont des <Text> React Native superposés en absolu.

const TOKENS = {
  '--ax-P': AX.P, '--ax-E': AX.E, '--ax-S': AX.S, '--ax-T': AX.T, '--ax-Env': AX.Env, '--ax-L': AX.L,
  '--alert': C.alert, '--gold': C.gold, '--cobalt': C.cobalt, '--ok': C.ok,
};
export const resolveColor = (col, fallback = C.cobalt) => {
  if (!col) return fallback;
  const m = /var\(\s*(--[\w-]+)\s*\)/.exec(col);
  if (m) return TOKENS[m[1]] || fallback;
  return col;
};
const PALETTE = [C.cobalt, AX.T, AX.E, AX.Env, AX.S, AX.L, C.alert, AX.P];
const fmtNum = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('fr-FR');
  return String(v).replace('.', ',');
};

// Petite étiquette absolue (centrée sur un x).
const Lbl = ({ x, y, w = 60, children, style }) => (
  <Text numberOfLines={1} style={[{ position: 'absolute', left: x - w / 2, top: y, width: w, textAlign: 'center', fontFamily: F.mono, fontSize: 10, color: C.inkMut }, style]}>{children}</Text>
);

// ---- Barres verticales ----
function BarChart({ data, unit = '', width, height = 150 }) {
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  const max = Math.max(...data.map((d) => Number(d.value))) * 1.12 || 1;
  const bw = (width - pad.l - pad.r) / data.length;
  const barW = Math.min(bw * 0.55, 54);
  const scaleY = (v) => pad.t + (1 - Number(v) / max) * (height - pad.t - pad.b);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke={C.border} strokeWidth={1} />
        {data.map((d, i) => {
          const x = pad.l + i * bw + (bw - barW) / 2;
          const y = scaleY(d.value);
          const col = d.highlight ? C.cobalt : resolveColor(d.color, AX.E);
          return <Rect key={i} x={x} y={y} width={barW} height={height - pad.b - y} rx={4} fill={col} opacity={d.highlight ? 1 : 0.85} />;
        })}
      </Svg>
      {data.map((d, i) => {
        const cx = pad.l + i * bw + bw / 2;
        return (
          <React.Fragment key={i}>
            <Lbl x={cx} y={scaleY(d.value) - 17} w={bw} style={{ fontFamily: F.monoSemi, fontSize: 11, color: C.ink }}>{fmtNum(d.value)}</Lbl>
            <Lbl x={cx} y={height - pad.b + 5} w={bw}>{d.label}</Lbl>
          </React.Fragment>
        );
      })}
      {unit ? <Text style={{ position: 'absolute', right: 2, top: 2, fontFamily: F.mono, fontSize: 10, color: C.inkMut }}>{unit.trim()}</Text> : null}
    </View>
  );
}

// ---- Courbes (multi-séries) ----
function LineChart({ labels, series, width, height = 160 }) {
  const pad = { l: 10, r: 12, t: 16, b: 26 };
  const all = series.flatMap((s) => s.values.map(Number));
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const n = labels.length;
  const x = (i) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (Number(v) - min) / span) * (height - pad.t - pad.b);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {[0, 0.5, 1].map((t, i) => (
          <Line key={i} x1={pad.l} y1={pad.t + t * (height - pad.t - pad.b)} x2={width - pad.r} y2={pad.t + t * (height - pad.t - pad.b)} stroke={C.border2} strokeWidth={1} />
        ))}
        {series.map((s, si) => {
          const col = resolveColor(s.color, PALETTE[si % PALETTE.length]);
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <G key={si}>
              <Polyline points={pts} fill="none" stroke={col} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={3.4} fill={C.panel} stroke={col} strokeWidth={2} />)}
            </G>
          );
        })}
      </Svg>
      {labels.map((l, i) => (
        (i === 0 || i === n - 1 || n <= 4)
          ? <Lbl key={i} x={x(i)} y={height - 14} w={72}>{l}</Lbl>
          : null
      ))}
      {series.length > 1 ? (
        <View style={{ position: 'absolute', top: 2, right: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', maxWidth: width * 0.7 }}>
          {series.map((s, si) => (
            <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: resolveColor(s.color, PALETTE[si % PALETTE.length]) }} />
              <Text style={{ fontFamily: F.body, fontSize: 10, color: C.inkDim }}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---- Anneau (donut) ----
function DonutChart({ data, centerV, centerL }) {
  const size = 130, r = 52, cx = size / 2, cy = size / 2, sw = 20;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((n, d) => n + Number(d.value), 0) || 1;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <G rotation={-90} originX={cx} originY={cy}>
            <Circle cx={cx} cy={cy} r={r} stroke={C.border2} strokeWidth={sw} fill="none" />
            {data.map((d, i) => {
              const frac = Number(d.value) / total;
              const col = resolveColor(d.color, PALETTE[i % PALETTE.length]);
              const seg = (
                <Circle key={i} cx={cx} cy={cy} r={r} stroke={col} strokeWidth={sw} fill="none"
                  strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ} strokeLinecap="butt" />
              );
              acc += frac;
              return seg;
            })}
          </G>
        </Svg>
        <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {centerV != null ? <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.ink }}>{centerV}</Text> : null}
          {centerL ? <Text style={{ fontFamily: F.mono, fontSize: 9, color: C.inkMut }}>{centerL}</Text> : null}
        </View>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        {data.map((d, i) => {
          const col = resolveColor(d.color, PALETTE[i % PALETTE.length]);
          const pct = Math.round((Number(d.value) / total) * 100);
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
  const inner = width - 28;
  return (
    <View style={{ backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.ink }}>{trend.title}</Text>
      {trend.note ? <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.inkMut, marginTop: 3, marginBottom: 10, lineHeight: 16 }}>{trend.note}</Text> : <View style={{ height: 10 }} />}
      {trend.type === 'bar' && <BarChart data={trend.data} unit={trend.unit} width={inner} />}
      {trend.type === 'line' && <LineChart labels={trend.labels} series={trend.series} width={inner} />}
      {trend.type === 'donut' && <DonutChart data={trend.data} centerV={trend.centerV} centerL={trend.centerL} />}
      {trend.src && trend.src.u ? (
        <TouchableOpacity onPress={() => Linking.openURL(trend.src.u)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 10 }}>
          <Icon name="link" size={11} color={C.cobalt} />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.cobalt }}>{trend.src.n || 'source'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
