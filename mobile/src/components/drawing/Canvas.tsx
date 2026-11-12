import React, { useState, useRef } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  Text,
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
}

const PALETTE = [
  '#E8A0A8', // Romantic Rose
  '#D9B77E', // Warm Gold
  '#FFF8F5', // Soft White
  '#F43F5E', // Intimate Crimson
  '#C084FC', // Dreamy Lavender
  '#38BDF8', // Starlight Sky
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const Canvas: React.FC<CanvasProps> = ({
  initialStrokes = [],
  onStrokesChange,
  height = 360,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState<string>(PALETTE[0]);
  const [currentWidth, setCurrentWidth] = useState<number>(4);
  const [currentPath, setCurrentPath] = useState<string>('');

  const currentPathRef = useRef<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const d = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = d;
        setCurrentPath(d);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const d = `${currentPathRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = d;
        setCurrentPath(d);
      },
      onPanResponderRelease: () => {
        if (!currentPathRef.current) return;
        const newStroke: Stroke = {
          path: currentPathRef.current,
          color: currentColor,
          width: currentWidth,
        };
        const updated = [...strokes, newStroke];
        setStrokes(updated);
        setRedoStack([]);
        currentPathRef.current = '';
        setCurrentPath('');
        onStrokesChange?.(updated);
      },
    })
  ).current;

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const updated = strokes.slice(0, strokes.length - 1);
    setStrokes(updated);
    setRedoStack((prev) => [last, ...prev]);
    onStrokesChange?.(updated);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    const updated = [...strokes, next];
    setStrokes(updated);
    setRedoStack(rest);
    onStrokesChange?.(updated);
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    setRedoStack([]);
    currentPathRef.current = '';
    setCurrentPath('');
    onStrokesChange?.([]);
  };

  return (
    <View style={styles.container}>
      {/* Top Toolbar: Undo, Redo, Clear */}
      <View style={styles.topToolbar}>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={strokes.length === 0}
            style={[styles.toolBtn, strokes.length === 0 && styles.disabled]}
          >
            <Undo2 size={18} color={strokes.length === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            disabled={redoStack.length === 0}
            style={[styles.toolBtn, redoStack.length === 0 && styles.disabled]}
          >
            <Redo2 size={18} color={redoStack.length === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClear}
            disabled={strokes.length === 0}
            style={[styles.toolBtn, strokes.length === 0 && styles.disabled]}
          >
            <Trash2 size={18} color={strokes.length === 0 ? theme.colors.textMuted : theme.colors.error} />
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
                  backgroundColor: currentWidth === w ? theme.colors.primary : theme.colors.textMuted,
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Drawing Canvas Area */}
      <View style={[styles.canvasArea, { height }]} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((s, idx) => (
            <Path
              key={idx}
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

