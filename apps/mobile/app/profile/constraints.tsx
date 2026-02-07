import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { formatDateRange } from '@/utils/formatters';

export type ConstraintType = 'injury' | 'travel' | 'availability';
export type ConstraintStatus = 'active' | 'resolved';
export type InjurySeverity = 'mild' | 'moderate' | 'severe';

export type Constraint = {
  id: string;
  constraintType: ConstraintType;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: ConstraintStatus;
  // Injury-specific
  injuryBodyPart?: string;
  injurySeverity?: InjurySeverity;
  injuryRestrictions?: string[];
  // Travel-specific
  travelDestination?: string;
  travelEquipmentAvailable?: string[];
  travelFacilitiesAvailable?: string[];
  // Availability-specific
  availabilityHoursPerWeek?: number;
  availabilityDaysAvailable?: string[];
};

// Mock data - will be replaced with real data from Supabase
const mockConstraints: Constraint[] = [];

const constraintTypeConfig: Record<
  ConstraintType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string }
> = {
  injury: { icon: 'bandage-outline', label: 'Injury', color: '#c62828' },
  travel: { icon: 'airplane-outline', label: 'Travel', color: '#1976d2' },
  availability: { icon: 'time-outline', label: 'Availability', color: '#f9a825' },
};

const severityConfig: Record<InjurySeverity, { label: string; color: string }> = {
  mild: { label: 'Mild', color: '#2e7d32' },
  moderate: { label: 'Moderate', color: '#f9a825' },
  severe: { label: 'Severe', color: '#c62828' },
};

// Exported for testing
export function getConstraintSubtitle(constraint: Constraint): string {
  switch (constraint.constraintType) {
    case 'injury': {
      const parts: string[] = [];
      if (constraint.injuryBodyPart) parts.push(constraint.injuryBodyPart.replaceAll('_', ' '));
      if (constraint.injurySeverity) {
        parts.push(severityConfig[constraint.injurySeverity].label);
      }
      return parts.join(' | ') || 'Injury';
    }
    case 'travel':
      return constraint.travelDestination || 'Travel period';
    case 'availability':
      if (constraint.availabilityHoursPerWeek != null) {
        return `${constraint.availabilityHoursPerWeek} hours/week available`;
      }
      return 'Schedule change';
    default:
      return '';
  }
}

export type ConstraintCardProps = {
  constraint: Constraint;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

// Exported for testing
export function ConstraintCard({
  constraint,
  colorScheme,
  onPress,
}: Readonly<ConstraintCardProps>) {
  const config = constraintTypeConfig[constraint.constraintType];
  const isActive = constraint.status === 'active';

  return (
    <Pressable
      style={[
        styles.constraintCard,
        { backgroundColor: Colors[colorScheme].surface },
        !isActive && styles.resolvedCard,
      ]}
      onPress={onPress}
      accessibilityLabel={`${constraint.title}, ${config.label}, ${isActive ? 'active' : 'resolved'}`}
      accessibilityRole="button"
    >
      <View style={[styles.constraintIcon, { backgroundColor: `${config.color}20` }]}>
        <Ionicons name={config.icon} size={24} color={config.color} />
      </View>
      <View style={styles.constraintContent}>
        <View style={styles.constraintHeader}>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.constraintTitle, !isActive && styles.resolvedText]}
            numberOfLines={1}
          >
            {constraint.title}
          </ThemedText>
          {!isActive && (
            <View
              style={[styles.statusBadge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <ThemedText type="caption" style={styles.statusText}>
                Resolved
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="caption" numberOfLines={1}>
          {getConstraintSubtitle(constraint)}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{
            color: isActive ? Colors[colorScheme].primary : Colors[colorScheme].textTertiary,
          }}
        >
          {formatDateRange(constraint.startDate, constraint.endDate)}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors[colorScheme].iconSecondary} />
    </Pressable>
  );
}

type AddConstraintCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  iconColor: string;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function AddConstraintCard({
  icon,
  title,
  description,
  iconColor,
  colorScheme,
  onPress,
}: Readonly<AddConstraintCardProps>) {
  return (
    <Pressable
      style={[styles.addConstraintCard, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
      accessibilityLabel={`Add ${title.toLowerCase()}`}
      accessibilityRole="button"
    >
      <View style={[styles.addConstraintIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.addConstraintContent}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption">{description}</ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
    </Pressable>
  );
}

export default function ConstraintsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const constraints = mockConstraints;

  const activeConstraints = constraints.filter((c) => c.status === 'active');
  const resolvedConstraints = constraints.filter((c) => c.status === 'resolved');

  const navigateToForm = (constraintType: ConstraintType) => {
    router.push(`/profile/constraint-form?type=${constraintType}`);
  };

  const navigateToEdit = (constraintId: string) => {
    router.push(`/profile/constraint-form?id=${constraintId}`);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.description}>
          Tell Khepri about things that affect your training. This helps generate appropriate
          workout recommendations.
        </ThemedText>

        {/* Active Constraints Section */}
        {activeConstraints.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="caption" style={styles.sectionTitle}>
              ACTIVE CONSTRAINTS ({activeConstraints.length})
            </ThemedText>
            <View style={styles.constraintsList}>
              {activeConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  colorScheme={colorScheme}
                  onPress={() => navigateToEdit(constraint.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Add Constraint Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            ADD A CONSTRAINT
          </ThemedText>
          <View style={styles.constraintsList}>
            <AddConstraintCard
              icon="bandage-outline"
              title="Injury"
              description="Log an injury to adjust training"
              iconColor={constraintTypeConfig.injury.color}
              colorScheme={colorScheme}
              onPress={() => navigateToForm('injury')}
            />
            <AddConstraintCard
              icon="airplane-outline"
              title="Travel"
              description="Traveling with limited equipment"
              iconColor={constraintTypeConfig.travel.color}
              colorScheme={colorScheme}
              onPress={() => navigateToForm('travel')}
            />
            <AddConstraintCard
              icon="time-outline"
              title="Availability Change"
              description="Temporary schedule changes"
              iconColor={constraintTypeConfig.availability.color}
              colorScheme={colorScheme}
              onPress={() => navigateToForm('availability')}
            />
          </View>
        </View>

        {/* Empty State */}
        {activeConstraints.length === 0 && (
          <ThemedView
            style={[styles.emptyState, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={Colors[colorScheme].success}
            />
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              No active constraints
            </ThemedText>
            <ThemedText type="caption" style={styles.emptyText}>
              Add constraints when something affects your ability to train normally, like an injury,
              travel, or schedule change.
            </ThemedText>
          </ThemedView>
        )}

        {/* Resolved Constraints Section */}
        {resolvedConstraints.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="caption" style={styles.sectionTitle}>
              RESOLVED ({resolvedConstraints.length})
            </ThemedText>
            <View style={styles.constraintsList}>
              {resolvedConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  colorScheme={colorScheme}
                  onPress={() => navigateToEdit(constraint.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Tip */}
        <ThemedView style={[styles.tipCard, { borderColor: Colors[colorScheme].primary }]}>
          <Ionicons name="bulb-outline" size={20} color={Colors[colorScheme].primary} />
          <ThemedText type="caption" style={styles.tipText}>
            Khepri will automatically adjust your training recommendations based on your active
            constraints. Mark constraints as resolved when they no longer apply.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  description: {
    marginBottom: 24,
    opacity: 0.8,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    paddingLeft: 4,
    fontWeight: '600',
  },
  constraintsList: {
    gap: 8,
  },
  constraintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resolvedCard: {
    opacity: 0.7,
  },
  constraintIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  constraintContent: {
    flex: 1,
    gap: 2,
  },
  constraintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  constraintTitle: {
    flex: 1,
  },
  resolvedText: {
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
  },
  addConstraintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addConstraintIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addConstraintContent: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyTitle: {
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 8,
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
  },
});
