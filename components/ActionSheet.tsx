import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type SheetAction = {
  key: string;
  label: string;
  icon: string;
  color?: string;
  danger?: boolean;
  onPress: () => void | Promise<void>;
};

type Props = {
  isVisible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

export default function ActionSheet({ isVisible, title, actions, onClose }: Props) {
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 300,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, translateY]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }] } pointerEvents="box-none">
        <Pressable style={styles.sheet} onPress={() => { /* swallow touches inside sheet so backdrop doesn't close */ }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {actions.map((a) => (
            <TouchableOpacity key={a.key} style={styles.row} onPress={a.onPress}>
              <Icon name={a.icon} size={22} color={a.danger ? '#ef4444' : a.color || '#111827'} />
              <Text style={[styles.rowText, a.danger && styles.dangerText]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.row, styles.cancel]} onPress={onClose}>
            <Icon name="close" size={22} color="#111827" />
            <Text style={styles.rowText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // subtle shadow for elevation on Android/iOS
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  title: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { color: '#111827', fontSize: 15, marginLeft: 12 },
  dangerText: { color: '#ef4444' },
  cancel: { borderBottomWidth: 0 },
});
