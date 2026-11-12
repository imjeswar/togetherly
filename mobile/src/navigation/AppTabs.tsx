import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { Home, Heart, Palette, Sparkles, BookHeart, User } from 'lucide-react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { DailyQuestionScreen } from '../screens/connect/DailyQuestionScreen';
import { DrawingScreen } from '../screens/connect/DrawingScreen';
import { DateIdeasScreen } from '../screens/dates/DateIdeasScreen';
import { MemoriesScreen } from '../screens/memories/MemoriesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { theme } from '../config/theme';

const Tab = createBottomTabNavigator();

export const AppTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Sanctuary',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="QuestionTab"
        component={DailyQuestionScreen}
        options={{
          tabBarLabel: 'Question',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="DrawingTab"
        component={DrawingScreen}
        options={{
          tabBarLabel: 'Canvas',
          tabBarIcon: ({ color, size }) => <Palette color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="DatesTab"
        component={DateIdeasScreen}
        options={{
          tabBarLabel: 'Dates',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="MemoriesTab"
        component={MemoriesScreen}
        options={{
          tabBarLabel: 'Memories',
          tabBarIcon: ({ color, size }) => <BookHeart color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#120F16',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

