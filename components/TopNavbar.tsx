import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  ViewStyle,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_USER_STORAGE_LIMIT_GB, DEFAULT_USER_STORAGE_LIMIT_BYTES } from "../config/quota";
import { subscribeUserUsage } from "../services/storageService";

interface TopNavbarProps {
  navigation: any;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ navigation }) => {
  const [search, setSearch] = useState("");
  const [showHierarchySheet, setShowHierarchySheet] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const { signOut, user } = useAuth();
  // Auto-hide user menu after this many milliseconds when opened
  const USER_MENU_AUTO_HIDE_MS = 700;

  // Drawer animation (left-to-right)
  const drawerWidth = useRef(Dimensions.get('window').width * 0.85).current;
  const drawerX = useRef(new Animated.Value(-drawerWidth)).current;

  // Real storage usage for current user
  const [usedBytes, setUsedBytes] = useState(0);
  const totalStorageGB = DEFAULT_USER_STORAGE_LIMIT_GB;
  const usedStorageGB = usedBytes / (1024 * 1024 * 1024);
  const usedPct = Math.min(100, Math.max(0, (usedBytes / DEFAULT_USER_STORAGE_LIMIT_BYTES) * 100));
  const storageFillStyle = React.useMemo<ViewStyle>(() => ({ width: `${Math.round(usedPct)}%` }), [usedPct]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserUsage(user.uid, setUsedBytes);
    return () => unsub();
  }, [user?.uid]);

  // Auto-hide the user menu shortly after opening so it doesn't linger.
  useEffect(() => {
    if (!showUserMenu) return;
    const t = setTimeout(() => setShowUserMenu(false), USER_MENU_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [showUserMenu]);

  const openDrawer = () => {
    setShowHierarchySheet(true);
    requestAnimationFrame(() => {
      drawerX.setValue(-drawerWidth);
      Animated.timing(drawerX, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeDrawer = () => {
    Animated.timing(drawerX, {
      toValue: -drawerWidth,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowHierarchySheet(false);
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error: any) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <View>
      <View style={styles.searchMenuBar}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.menuIcon}
            accessibilityLabel="Open hierarchy"
          >
            <Icon name="file-tree" size={24} color="#5f6368" />
          </TouchableOpacity>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#5f6368" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#6b7280"
              ref={searchInputRef}
              value={search}
              onChangeText={setSearch}
              numberOfLines={1}
              autoCapitalize="none"
              autoCorrect={false}
              allowFontScaling
            />
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.menuIcon}
            onPress={() => setShowUserMenu(!showUserMenu)}
          >
            <Icon name="account-circle" size={24} color="#5f6368" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hierarchy Drawer (left slide-in) */}
      <Modal
        visible={showHierarchySheet}
        animationType="none"
        transparent
        onRequestClose={closeDrawer}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeDrawer} />
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerX }] }]}>
          <View style={styles.sheetHeader}>
            <Icon name="folder" size={22} color="#111827" />
            <Text style={styles.sheetTitle}>Browse</Text>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <TouchableOpacity style={styles.sheetItem} onPress={() => { closeDrawer(); navigation.navigate('Uploads'); }}>
              <Icon name="upload" size={20} color="#6b7280" />
              <Text style={styles.sheetItemText}>Uploads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={() => { closeDrawer(); navigation.navigate('Bin'); }}>
              <Icon name="trash-can-outline" size={20} color="#ef4444" />
              <Text style={styles.sheetItemText}>Bin</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.sheetItem} onPress={() => { closeDrawer(); navigation.navigate('Settings'); }}>
              <Icon name="cog-outline" size={20} color="#6b7280" />
              <Text style={styles.sheetItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={() => { closeDrawer(); navigation.navigate('HelpFeedback'); }}>
              <Icon name="help-circle-outline" size={20} color="#6b7280" />
              <Text style={styles.sheetItemText}>Help & feedback</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <View style={styles.sheetItem}>
              <Icon name="harddisk" size={20} color="#6b7280" />
              <Text style={styles.sheetItemText}>Storage</Text>
            </View>
            <View style={styles.storageBarContainer}>
              <View style={styles.storageBarBackground}>
                <View style={[styles.storageBarFill, storageFillStyle]} />
              </View>
              <Text style={styles.storageBarText}>{`${usedStorageGB.toFixed(1)} GB of ${totalStorageGB} GB used`}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* User menu shown in a modal so outside taps always dismiss it */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable style={styles.userBackdrop} onPress={() => setShowUserMenu(false)} />
        <View style={styles.userMenu} pointerEvents="box-none">
          <View style={styles.userInfo}>
            <Icon name="account-circle" size={40} color="#6b7280" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Hi, {user?.email?.split('@')[0] || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            </View>
          </View>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={handleSignOut}
          >
            <Icon name="logout" size={18} color="#ef4444" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  searchMenuBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    marginTop: 32,
  },
  leftSection: {
    flex: 0.15,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  centerSection: {
    flex: 0.7,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  rightSection: {
    flex: 0.15,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    width: '100%',
    height: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuIcon: {
    padding: 12,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#202124",
    // remove fixed height to avoid clipping placeholder on some devices
    lineHeight: 20,
    paddingVertical: 0,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '85%',
    backgroundColor: '#fff',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  sheetContent: {
    paddingVertical: 8,
  },
  sheetSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetSectionHeaderText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#111827',
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 4,
  },
  userBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  userMenu: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
    minWidth: 220,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  userMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 14,
    color: "#ef4444",
    marginLeft: 12,
  },
  storageRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  storageFill: {
    height: 8,
    backgroundColor: '#22c55e',
  },
  storageText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  storageBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  storageBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  storageBarText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
});

export default TopNavbar;
