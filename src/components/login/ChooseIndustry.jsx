import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';

const ChooseIndustry = ({ onNavigate, routeData }) => {
  const [selectedIndustries, setSelectedIndustries] = useState([]);

  const industries = [
    { id: '1', name: 'Agriculture & Agro', icon: '🌾' },
    { id: '2', name: 'Textiles & Apparel', icon: '👕' },
    { id: '3', name: 'Electronics & Tech', icon: '💻' },
    { id: '4', name: 'Construction', icon: '🏗️' },
    { id: '5', name: 'Manufacturing', icon: '🏭' },
    { id: '6', name: 'FMCG', icon: '📦' },
    { id: '7', name: 'Automotive', icon: '🚗' },
    { id: '8', name: 'Chemicals', icon: '🧪' },
    { id: '9', name: 'Metals & Mining', icon: '⛏️' },
    { id: '10', name: 'Other', icon: '🔄' },
  ];

  const toggleIndustry = (industry) => {
    if (selectedIndustries.some(item => item.id === industry.id)) {
      setSelectedIndustries(selectedIndustries.filter(item => item.id !== industry.id));
    } else {
      setSelectedIndustries([...selectedIndustries, industry]);
    }
  };

  const handleContinue = () => {
    if (selectedIndustries.length > 0) {
      const industryNames = selectedIndustries.map(i => i.name).join(', ');
      onNavigate('Dashboard', { ...routeData, industries: industryNames });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonCircle}
          onPress={() => onNavigate('Login')}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Industry</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Select Your Industries</Text>
          <Text style={styles.subtitleText}>
            Choose one or more fields that describe your business to personalize your Pravisti experience.
          </Text>
        </View>

        <View style={styles.gridContainer}>
          {industries.map((item) => {
            const isSelected = selectedIndustries.some(i => i.id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.industryCard,
                  isSelected && styles.industryCardSelected
                ]}
                onPress={() => toggleIndustry(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected
                ]}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <Text style={[
                  styles.industryName,
                  isSelected && styles.industryNameSelected
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedIndustries.length === 0 && styles.continueButtonDisabled
          ]}
          activeOpacity={0.8}
          onPress={handleContinue}
          disabled={selectedIndustries.length === 0}
        >
          <Text style={styles.continueButtonText}>
            Continue to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8ECF0',
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  backButtonIcon: {
    fontSize: 24,
    color: '#1A1D1F',
    fontWeight: '300',
    marginTop: -2,
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 120,
  },
  titleSection: {
    marginBottom: 30,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  industryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  industryCardSelected: {
    borderColor: '#3170cdff',
    backgroundColor: '#F0F7FF',
    shadowColor: '#3170cdff',
    shadowOpacity: 0.15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  icon: {
    fontSize: 24,
  },
  industryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  industryNameSelected: {
    color: '#3170cdff',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  continueButton: {
    backgroundColor: '#3170cdff',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ChooseIndustry;
