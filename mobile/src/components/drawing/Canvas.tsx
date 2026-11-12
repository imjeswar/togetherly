import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Undo2, Redo2, Trash2 } from 'lucide-react-native';
import { theme } from '../../config/theme';

export interface Stroke {
  path: string;
  color: string;
  width: number;
}

interface CanvasProps {
  initialStrokes?: Stroke[];
  onStrokesChange?: (strokes: Stroke[]) => void;
  height?: number;
  readOnly?: boolean;
}

export const PALETTE = [
  '#E8A0A8', // Romantic Rose
  '#D9B77E', // Warm Gold
  '#FFF8F5', // Soft White
  '#F43F5E', // Intimate Crimson
  '#C084FC', // Dreamy Lavender
  '#38BDF8', // Starlight Sky
];

export const STROKE_WIDTHS = [2, 4, 8, 14];

export const Canvas: React.FC<CanvasProps> = ({
  initialStrokes = [],
  onStrokesChange,
  height = 360,
  readOnly = false,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState<string>(PALETTE[0]);
  const [currentWidth, setCurrentWidth] = useState<number>(4);
  const [currentPath, setCurrentPath] = useState<string>('');

  // Critical Mutable Refs to prevent stale closure bugs in PanResponder
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const currentColorRef = useRef<string>(PALETTE[0]);
  const currentWidthRef = useRef<number>(4);
  const currentPathRef = useRef<string>('');

  // Keep refs in sync with state
  strokesRef.current = strokes;
  currentColorRef.current = currentColor;
  currentWidthRef.current = currentWidth;

  // Sync external initialStrokes when updated (e.g., from partner or DB fetch)
  useEffect(() => {
    if (initialStrokes && Array.isArray(initialStrokes)) {
      setStrokes(initialStrokes);
      strokesRef.current = initialStrokes;
    }
  }, [initialStrokes]);

  // PanResponder constructed with refs so it always reads the fresh state
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !readOnly,
      onMoveShouldSetPanResponder: () => !readOnly,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        if (readOnly) return;
        const { locationX, locationY } = evt.nativeEvent;
        // Start stroke at touch point
        const d = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = d;
        setCurrentPath(d);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (readOnly) return;
        const { locationX, locationY } = evt.nativeEvent;
        const d = `${currentPathRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = d;
        setCurrentPath(d);
      },
      onPanResponderRelease: () => {
        if (readOnly || !currentPathRef.current) return;

        // If tap without drag, create a tiny line so a dot or point is visible
        let finalPath = currentPathRef.current;
        if (!finalPath.includes('L')) {
          const match = finalPath.match(/M([\d.-]+),([\d.-]+)/);
          if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            finalPath = `M${x.toFixed(1)},${y.toFixed(1)} L${(x + 0.5).toFixed(1)},${(y + 0.5).toFixed(1)}`;
          }
        }

        const newStroke: Stroke = {
          path: finalPath,
          color: currentColorRef.current,
          width: currentWidthRef.current,
        };

        const updated = [...strokesRef.current, newStroke];
        strokesRef.current = updated;
        setStrokes(updated);
        setRedoStack([]);
        currentPathRef.current = '';
        setCurrentPath('');
        onStrokesChange?.(updated);
      },
      onPanResponderTerminate: () => {
        currentPathRef.current = '';
        setCurrentPath('');
      },
    })
  ).current;

  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const current = strokesRef.current;
    const last = current[current.length - 1];
    const updated = current.slice(0, current.length - 1);
    strokesRef.current = updated;
    setStrokes(updated);
    setRedoStack((prev) => [last, ...prev]);
    onStrokesChange?.(updated);
  }, [onStrokesChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    const updated = [...strokesRef.current, next];
    strokesRef.current = updated;
    setStrokes(updated);
    setRedoStack(rest);
    onStrokesChange?.(updated);
  }, [redoStack, onStrokesChange]);

  const handleClear = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = [];
    setStrokes([]);
    setRedoStack([]);
    currentPathRef.current = '';
    setCurrentPath('');
    onStrokesChange?.([]);
  }, [onStrokesChange]);

  return (
    <View style={styles.container}>
      {/* Top Toolbar: Undo, Redo, Clear */}
      {!readOnly && (
        <View style={styles.topToolbar}>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={strokes.length === 0}
              style={[styles.toolBtn, strokes.length === 0 && styles.disabled]}
            >
              <Undo2
                size={18}
                color={strokes.length === 0 ? theme.colors.textMuted : theme.colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRedo}
              disabled={redoStack.length === 0}
              style={[styles.toolBtn, redoStack.length === 0 && styles.disabled]}
            >
              <Redo2
                size={18}
                color={redoStack.length === 0 ? theme.colors.textMuted : theme.colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClear}
              disabled={strokes.length === 0}
              style={[styles.toolBtn, strokes.length === 0 && styles.disabled]}
            >
              <Trash2
                size={18}
                color={strokes.length === 0 ? theme.colors.textMuted : theme.colors.error}
              />
            </TouchableOpacity>
          </View>

          {/* Brush sizes */}
          <View style={styles.row}>
            {STROKE_WIDTHS.map((w) => (
              <TouchableOpacity
                key={w}
                onPress={() => setCurrentWidth(w)}
                style={[styles.sizeBtn, currentWidth === w && styles.sizeBtnActive]}
              >
                <View
                  style={{
                    width: w + 4,
                    height: w + 4,
                    borderRadius: (w + 4) / 2,
                    backgroundColor:
                      currentWidth === w ? theme.colors.primary : theme.colors.textMuted,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Drawing Canvas Area */}
      <View
        style={[styles.canvasArea, { height }]}
        {...(!readOnly ? panResponder.panHandlers : {})}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((s, idx) => (
            <Path
              key={`stroke-${idx}`}
              d={s.path}
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={currentColor}
              strokeWidth={currentWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
      </View>

      {/* Color Palette */}
      {!readOnly && (
        <View style={styles.paletteRow}>
          {PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCurrentColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                currentColor === c && styles.colorSwatchActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    padding: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  disabled: {
    opacity: 0.35,
  },
  sizeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sizeBtnActive: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  canvasArea: {
    width: '100%',
    backgroundColor: '#14101A',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorSwatchActive: {
    borderWidth: 2.5,
    borderColor: '#FFF8F5',
    transform: [{ scale: 1.15 }],
  },
});
