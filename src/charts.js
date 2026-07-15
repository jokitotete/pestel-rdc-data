import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import Svg, { Rect, Circle, Line, Polyline, G } from 'react-native-svg';
import { C, F, AX, SP, TYPE, RADIUS } from './theme';
import { Icon } from './ui';
import { confirmOpenURL } from './safeUrl';

// NB : on n'utilise PAS <Text> de react-native-svg (invisible avec police custom).
// Toutes les étiquettes sont des <Text> React Native superposés en absolu.

// RS1-08 : résolution PARESSEUSE des couleurs de thème. AX.* est statique (rampe graphique, identique
// clair/sombre) mais C.cobalt/alert/gold/ok sont MUTÉS par applyTheme → les capturer dans un const de module
// (évalué à l'import, AVANT applyTheme) figeait le cobalt CLAIR sur panel sombre (~1,7:1). On lit C.* AU RUNTIME.
const tokenTable = () => ({
  '--ax-P': AX.P, '--ax-E': AX.E, '--ax-S': AX.S, '--ax-T': AX.T, '--ax-Env': AX.Env, '--ax-L': AX.L,
  '--alert': C.alert, '--gold': C.gold, '--cobalt': C.cobalt, '--ok': C.ok,
});
export const resolveColor = (col, fallback) => {
  const fb = fallback || C.cobalt;
  if (!col) return fb;
  const m = String(col).match(/var\(\s*(--[\w-]+)\s*\)/);
  if (m) return tokenTable()[m[1]] || fb;
  return col;
};
const palette = () => [C.cobalt, AX.T, AX.E, AX.Env, AX.S, AX.L, C.alert, AX.P];
const fmtNum = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('fr-FR');
  return String(v).replace('.', ',');
};
// Format COMPACT pour les graduations de l'axe Y (tient dans la marge gauche) : arrondi selon l'ordre de
// grandeur (≥100 → entier « 352 » ; 1–100 → 1 décimale « 13,5 » ; <1 → 2 décimales).
const fmtAxis = (v) => {
  const a = Math.abs(Number(v));
  if (!isFinite(a)) return '';
  if (a >= 10000) return Math.round(Number(v) / 1000) + 'k';
  if (a >= 100) return String(Math.round(Number(v)));
  if (a >= 1) return String(Math.round(Number(v) * 10) / 10).replace('.', ',');
  return String(Math.round(Number(v) * 100) / 100).replace('.', ',');
};

// Petite étiquette absolue (centrée sur un x).
const Lbl = ({ x, y, w = 60, children, style }) => (
  <Text numberOfLines={1} style={[TYPE.caption, { position: 'absolute', left: x - w / 2, top: y, width: w, textAlign: 'center', color: C.inkMut }, style]}>{children}</Text>
);

// ---- Barres verticales ----
function BarChart({ data, unit = '', width, height = 150 }) {
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  data = Array.isArray(data) ? data.filter((d) => d && typeof d === 'object') : [];   // RS3.3 : défensif
  if (!data.length) return null;
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
            <Lbl x={cx} y={scaleY(d.value) - 17} w={bw} style={[TYPE.mono, { color: C.ink }]}>{fmtNum(d.value)}</Lbl>
            <Lbl x={cx} y={height - pad.b + 5} w={bw}>{d.label}</Lbl>
          </React.Fragment>
        );
      })}
      {unit ? <Text style={[TYPE.caption, { position: 'absolute', right: 2, top: 2, color: C.inkMut }]}>{String(unit).trim()}</Text> : null}
    </View>
  );
}

// ---- Courbes (multi-séries) ----
function LineChart({ labels, series, width, height = 160 }) {
  const pad = { l: 46, r: 12, t: 16, b: 26 };   // marge gauche élargie pour les VALEURS de l'axe Y (ordonnées)
  series = Array.isArray(series) ? series.filter((s) => s && Array.isArray(s.values)) : [];   // RS3.3 : défensif
  labels = Array.isArray(labels) ? labels : [];
  if (!series.length || !labels.length) return null;
  const all = series.flatMap((s) => s.values.map(Number));
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const n = labels.length;
  const x = (i) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (Number(v) - min) / span) * (height - pad.t - pad.b);
  const gridY = (t) => pad.t + t * (height - pad.t - pad.b);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {[0, 0.5, 1].map((t, i) => (
          <Line key={i} x1={pad.l} y1={gridY(t)} x2={width - pad.r} y2={gridY(t)} stroke={C.border2} strokeWidth={1} />
        ))}
        {series.map((s, si) => {
          const col = resolveColor(s.color, palette()[si % 8]);
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <G key={si}>
              <Polyline points={pts} fill="none" stroke={col} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={3.4} fill={C.panel} stroke={col} strokeWidth={2} />)}
            </G>
          );
        })}
      </Svg>
      {/* Valeurs de l'axe Y (ordonnées) — max en haut, milieu, min en bas — alignées sur les 3 lignes de grille.
          NB user : la courbe n'affichait aucune échelle Y ; on la rend lisible. Text RN (SVG Text invisible). */}
      {[0, 0.5, 1].map((t, i) => (
        <Text key={`y${i}`} numberOfLines={1}
          style={[TYPE.caption, { position: 'absolute', left: 0, top: gridY(t) - 7, width: pad.l - 6, textAlign: 'right', color: C.inkMut }]}>
          {fmtAxis(max - t * span)}
        </Text>
      ))}
      {labels.map((l, i) => (
        (i === 0 || i === n - 1 || n <= 4)
          ? <Lbl key={i} x={x(i)} y={height - 14} w={72}>{l}</Lbl>
          : null
      ))}
      {series.length > 1 ? (
        <View style={{ position: 'absolute', top: 2, right: 2, flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, justifyContent: 'flex-end', maxWidth: width * 0.7 }}>
          {series.map((s, si) => (
            <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: RADIUS.xs, backgroundColor: resolveColor(s.color, palette()[si % 8]) }} />
              <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{s.name}</Text>
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
  data = Array.isArray(data) ? data.filter((d) => d && typeof d === 'object') : [];   // RS3.3 : défensif
  if (!data.length) return null;
  const total = data.reduce((n, d) => n + Number(d.value), 0) || 1;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md2 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <G rotation={-90} originX={cx} originY={cy}>
            <Circle cx={cx} cy={cy} r={r} stroke={C.border2} strokeWidth={sw} fill="none" />
            {data.map((d, i) => {
              const frac = Number(d.value) / total;
              const col = resolveColor(d.color, palette()[i % 8]);
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
          {centerV != null ? <Text style={[TYPE.data, { color: C.ink }]}>{centerV}</Text> : null}
          {/* QA v1.2 : rôle DÉDIÉ (donutLabel 9 px) — `caption` (11 px mono) débordait sur l'anneau. */}
          {centerL ? <Text style={[TYPE.donutLabel, { color: C.inkMut }]} numberOfLines={1}>{centerL}</Text> : null}
        </View>
      </View>
      <View style={{ flex: 1, gap: SP.xs2 }}>
        {data.map((d, i) => {
          const col = resolveColor(d.color, palette()[i % 8]);
          const pct = Math.round((Number(d.value) / total) * 100);
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
              <View style={{ width: 9, height: 9, borderRadius: RADIUS.xs, backgroundColor: col }} />
              <Text style={[TYPE.bodySm, { color: C.inkDim, flex: 1 }]} numberOfLines={1}>{d.label}</Text>
              <Text style={[TYPE.mono, { color: C.ink }]}>{pct}%</Text>
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
    <View style={{ backgroundColor: C.panel, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, padding: SP.md2, marginBottom: SP.md }}>
      <Text style={[TYPE.cardTitle, { color: C.ink }]}>{trend.title}</Text>
      {trend.note ? <Text style={[TYPE.bodySm, { color: C.inkMut, marginTop: SP.xs, marginBottom: SP.sm2 }]}>{trend.note}</Text> : <View style={{ height: 10 }} />}
      {trend.type === 'bar' && <BarChart data={trend.data} unit={trend.unit} width={inner} />}
      {trend.type === 'line' && <LineChart labels={trend.labels} series={trend.series} width={inner} />}
      {trend.type === 'donut' && <DonutChart data={trend.data} centerV={trend.centerV} centerL={trend.centerL} />}
      {trend.src && trend.src.u ? (
        <TouchableOpacity onPress={() => confirmOpenURL(trend.src.u)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, alignSelf: 'flex-end', marginTop: SP.sm2 }}>
          <Icon name="link" size={11} color={C.cobalt} />
          <Text style={[TYPE.caption, { color: C.cobalt }]}>{trend.src.n || 'source'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
