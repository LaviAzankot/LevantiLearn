/**
 * Tab bar layout — Stitch Material You design system
 * English labels, safe-area-aware height
 */
import { Tabs } from 'expo-router';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  light: { bar: '#ffffff', border: '#e8e8e4', active: '#fe4d01', inactive: '#9a9690' },
  dark:  { bar: '#242220', border: '#3a3830', active: '#ff6b2b', inactive: '#6b6866' },
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name, nameFilled, focused, color,
}: {
  name: IoniconName; nameFilled: IoniconName; focused: boolean; color: string;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={[styles.indicator, { backgroundColor: color }]} />}
      <Ionicons name={focused ? nameFilled : name} size={24} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const c      = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bar,
          borderTopWidth:  1,
          borderTopColor:  c.border,
          height:          54 + insets.bottom,
          paddingBottom:   insets.bottom + 6,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarLabelStyle: {
          fontSize:      11,
          fontWeight:    '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="book-outline" nameFilled="book" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="refresh-outline" nameFilled="refresh" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person-outline" nameFilled="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     4,
    gap:            2,
  },
  indicator: {
    width:        20,
    height:       3,
    borderRadius: 2,
    marginBottom: 4,
  },
});
