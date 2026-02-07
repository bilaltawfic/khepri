import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { FormDatePicker } from '@/components/FormDatePicker';
import { FormInput } from '@/components/FormInput';
import { FormSelect, type SelectOption } from '@/components/FormSelect';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

import type { GoalPriority, GoalType } from './goals';

type FormData = {
  title: string;
  description: string;
  targetDate: Date | null;
  priority: GoalPriority;
  // Race-specific
  raceEventName: string;
  raceDistance: string;
  raceLocation: string;
  raceTargetHours: string;
  raceTargetMinutes: string;
  raceTargetSeconds: string;
  // Performance-specific
  perfMetric: string;
  perfCurrentValue: string;
  perfTargetValue: string;
  // Fitness-specific
  fitnessMetric: string;
  fitnessTargetValue: string;
  // Health-specific
  healthMetric: string;
  healthCurrentValue: string;
  healthTargetValue: string;
};

const priorityOptions: SelectOption<GoalPriority>[] = [
  { label: 'A - Primary (highest priority)', value: 'A' },
  { label: 'B - Secondary (important)', value: 'B' },
  { label: 'C - Maintenance (background)', value: 'C' },
];

const raceDistanceOptions: SelectOption[] = [
  { label: 'Sprint Triathlon', value: 'sprint' },
  { label: 'Olympic Triathlon', value: 'olympic' },
  { label: 'Ironman 70.3', value: '70.3' },
  { label: 'Ironman 140.6', value: '140.6' },
  { label: '5K Run', value: '5k' },
  { label: '10K Run', value: '10k' },
  { label: 'Half Marathon', value: 'half_marathon' },
  { label: 'Marathon', value: 'marathon' },
  { label: 'Century Ride (100mi)', value: 'century' },
  { label: 'Other', value: 'other' },
];

const perfMetricOptions: SelectOption[] = [
  { label: 'FTP (watts)', value: 'ftp' },
  { label: 'Running Threshold Pace', value: 'threshold_pace' },
  { label: 'Critical Swim Speed', value: 'css' },
  { label: 'VO2 Max', value: 'vo2max' },
  { label: 'Other', value: 'other' },
];

const fitnessMetricOptions: SelectOption[] = [
  { label: 'Weekly Running Volume (km)', value: 'weekly_run_km' },
  { label: 'Weekly Cycling Volume (km)', value: 'weekly_bike_km' },
  { label: 'Weekly Swimming Volume (km)', value: 'weekly_swim_km' },
  { label: 'Weekly Training Hours', value: 'weekly_hours' },
  { label: 'Workout Consistency (%)', value: 'consistency' },
  { label: 'Other', value: 'other' },
];

const healthMetricOptions: SelectOption[] = [
  { label: 'Weight (kg)', value: 'weight_kg' },
  { label: 'Body Fat (%)', value: 'body_fat_percentage' },
  { label: 'Resting Heart Rate (bpm)', value: 'resting_hr' },
  { label: 'Sleep Quality', value: 'sleep_quality' },
  { label: 'Other', value: 'other' },
];

const goalTypeInfo: Record<
  GoalType,
  { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; description: string }
> = {
  race: {
    title: 'Race Goal',
    icon: 'trophy',
    description: 'A specific event you are training for, like a triathlon or marathon.',
  },
  performance: {
    title: 'Performance Goal',
    icon: 'trending-up',
    description: 'A fitness metric you want to improve, like FTP or threshold pace.',
  },
  fitness: {
    title: 'Fitness Goal',
    icon: 'fitness',
    description: 'Volume or consistency targets for your training.',
  },
  health: {
    title: 'Health Goal',
    icon: 'heart',
    description: 'Weight, wellness, or lifestyle targets.',
  },
};

const initialFormData: FormData = {
  title: '',
  description: '',
  targetDate: null,
  priority: 'B',
  raceEventName: '',
  raceDistance: '',
  raceLocation: '',
  raceTargetHours: '',
  raceTargetMinutes: '',
  raceTargetSeconds: '',
  perfMetric: '',
  perfCurrentValue: '',
  perfTargetValue: '',
  fitnessMetric: '',
  fitnessTargetValue: '',
  healthMetric: '',
  healthCurrentValue: '',
  healthTargetValue: '',
};

// Goal type specific validation rules
const goalTypeValidation: Record<
  GoalType,
  (data: FormData) => Partial<Record<keyof FormData, string>>
> = {
  race: (data) => (data.targetDate ? {} : { targetDate: 'Please select the race date' }),
  performance: (data) => ({
    ...(data.perfMetric ? {} : { perfMetric: 'Please select a metric' }),
    ...(data.perfTargetValue ? {} : { perfTargetValue: 'Please enter a target value' }),
  }),
  fitness: (data) => ({
    ...(data.fitnessMetric ? {} : { fitnessMetric: 'Please select a metric' }),
    ...(data.fitnessTargetValue ? {} : { fitnessTargetValue: 'Please enter a target value' }),
  }),
  health: (data) => ({
    ...(data.healthMetric ? {} : { healthMetric: 'Please select a metric' }),
    ...(data.healthTargetValue ? {} : { healthTargetValue: 'Please enter a target value' }),
  }),
};

function validateGoalForm(
  data: FormData,
  goalType: GoalType
): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (!data.title.trim()) {
    errors.title = 'Please enter a title for your goal';
  }
  return { ...errors, ...goalTypeValidation[goalType](data) };
}

export default function GoalFormScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const params = useLocalSearchParams<{ type?: string; id?: string }>();

  const goalType = (params.type as GoalType) || 'race';
  const isEditing = !!params.id;
  const typeInfo = goalTypeInfo[goalType];

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // TODO: Load existing goal data if editing
  useEffect(() => {
    if (params.id) {
      // Load goal data from Supabase
    }
  }, [params.id]);

  const validateForm = (): boolean => {
    const newErrors = validateGoalForm(formData, goalType);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // TODO: Save to Supabase
    Alert.alert('Success', isEditing ? 'Goal updated successfully' : 'Goal added successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // TODO: Delete from Supabase
          router.back();
        },
      },
    ]);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const renderGoalTypeFields = () => {
    switch (goalType) {
      case 'race':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Race Details
            </ThemedText>

            <FormInput
              label="Event Name"
              value={formData.raceEventName}
              onChangeText={(text) => updateField('raceEventName', text)}
              placeholder="e.g., Ironman Florida"
              helpText="The official name of the race"
            />

            <FormSelect
              label="Distance"
              value={formData.raceDistance || null}
              options={raceDistanceOptions}
              onChange={(value) => updateField('raceDistance', value)}
              placeholder="Select race distance"
            />

            <FormInput
              label="Location"
              value={formData.raceLocation}
              onChangeText={(text) => updateField('raceLocation', text)}
              placeholder="e.g., Panama City Beach, FL"
            />

            <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
              Target Time (optional)
            </ThemedText>
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <FormInput
                  label=""
                  value={formData.raceTargetHours}
                  onChangeText={(text) => updateField('raceTargetHours', text)}
                  placeholder="HH"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <ThemedText style={styles.timeSeparator}>:</ThemedText>
              <View style={styles.timeInput}>
                <FormInput
                  label=""
                  value={formData.raceTargetMinutes}
                  onChangeText={(text) => updateField('raceTargetMinutes', text)}
                  placeholder="MM"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <ThemedText style={styles.timeSeparator}>:</ThemedText>
              <View style={styles.timeInput}>
                <FormInput
                  label=""
                  value={formData.raceTargetSeconds}
                  onChangeText={(text) => updateField('raceTargetSeconds', text)}
                  placeholder="SS"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        );

      case 'performance':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Performance Details
            </ThemedText>

            <FormSelect
              label="Metric"
              value={formData.perfMetric || null}
              options={perfMetricOptions}
              onChange={(value) => updateField('perfMetric', value)}
              placeholder="Select metric to improve"
              error={errors.perfMetric}
            />

            <FormInput
              label="Current Value"
              value={formData.perfCurrentValue}
              onChangeText={(text) => updateField('perfCurrentValue', text)}
              placeholder="Your current level"
              keyboardType="decimal-pad"
              helpText="Where you are now"
            />

            <FormInput
              label="Target Value"
              value={formData.perfTargetValue}
              onChangeText={(text) => updateField('perfTargetValue', text)}
              placeholder="Your goal"
              keyboardType="decimal-pad"
              error={errors.perfTargetValue}
              helpText="Where you want to be"
            />
          </View>
        );

      case 'fitness':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Fitness Details
            </ThemedText>

            <FormSelect
              label="Metric"
              value={formData.fitnessMetric || null}
              options={fitnessMetricOptions}
              onChange={(value) => updateField('fitnessMetric', value)}
              placeholder="Select fitness metric"
              error={errors.fitnessMetric}
            />

            <FormInput
              label="Target Value"
              value={formData.fitnessTargetValue}
              onChangeText={(text) => updateField('fitnessTargetValue', text)}
              placeholder="Your target"
              keyboardType="decimal-pad"
              error={errors.fitnessTargetValue}
              helpText="The level you want to reach or maintain"
            />
          </View>
        );

      case 'health':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Health Details
            </ThemedText>

            <FormSelect
              label="Metric"
              value={formData.healthMetric || null}
              options={healthMetricOptions}
              onChange={(value) => updateField('healthMetric', value)}
              placeholder="Select health metric"
              error={errors.healthMetric}
            />

            <FormInput
              label="Current Value"
              value={formData.healthCurrentValue}
              onChangeText={(text) => updateField('healthCurrentValue', text)}
              placeholder="Your current level"
              keyboardType="decimal-pad"
              helpText="Where you are now"
            />

            <FormInput
              label="Target Value"
              value={formData.healthTargetValue}
              onChangeText={(text) => updateField('healthTargetValue', text)}
              placeholder="Your goal"
              keyboardType="decimal-pad"
              error={errors.healthTargetValue}
              helpText="Where you want to be"
            />
          </View>
        );
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Goal Type Header */}
        <View style={[styles.typeHeader, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
          <View style={[styles.typeIcon, { backgroundColor: Colors[colorScheme].surface }]}>
            <Ionicons name={typeInfo.icon} size={28} color={Colors[colorScheme].primary} />
          </View>
          <View style={styles.typeInfo}>
            <ThemedText type="defaultSemiBold">{typeInfo.title}</ThemedText>
            <ThemedText type="caption">{typeInfo.description}</ThemedText>
          </View>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Goal Information
          </ThemedText>

          <FormInput
            label="Title"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
            placeholder="Give your goal a name"
            error={errors.title}
          />

          <FormInput
            label="Description (optional)"
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            placeholder="Add any notes or context"
            multiline
            numberOfLines={3}
            style={styles.multilineInput}
          />

          <FormDatePicker
            label={goalType === 'race' ? 'Race Date' : 'Target Date'}
            value={formData.targetDate}
            onChange={(date) => updateField('targetDate', date)}
            placeholder="Select a date"
            minimumDate={new Date()}
            error={errors.targetDate}
            helpText={
              goalType === 'race' ? 'When is the race?' : 'When do you want to achieve this?'
            }
            allowClear
          />

          <FormSelect
            label="Priority"
            value={formData.priority}
            options={priorityOptions}
            onChange={(value) => updateField('priority', value)}
            helpText="A-priority goals get focused training attention"
          />
        </View>

        {/* Goal Type Specific Fields */}
        {renderGoalTypeFields()}

        {/* Delete Button (only when editing) */}
        {isEditing && (
          <Button
            title="Delete Goal"
            variant="text"
            onPress={handleDelete}
            style={styles.deleteButton}
            accessibilityLabel="Delete this goal"
          />
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title={isEditing ? 'Save Changes' : 'Add Goal'}
          onPress={handleSave}
          accessibilityLabel={isEditing ? 'Save goal changes' : 'Add new goal'}
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          accessibilityLabel="Cancel and go back"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInput: {
    width: 70,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  deleteButton: {
    marginTop: 8,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
