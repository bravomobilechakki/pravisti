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
import {
  Sprout,
  Shirt,
  Laptop,
  HardHat,
  Factory,
  Package,
  Car,
  FlaskConical,
  Hammer,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react-native';

const ChooseIndustry = ({ onNavigate, routeData }) => {
  const [selectedIndustries, setSelectedIndustries] = useState([]);

  const industries = [
    { id: '1', name: 'Agriculture & Agro', Icon: Sprout, color: '#16a34a' },
    { id: '2', name: 'Textiles & Apparel', Icon: Shirt, color: '#7c3aed' },
    { id: '3', name: 'Electronics & Tech', Icon: Laptop, color: '#2563eb' },
    { id: '4', name: 'Construction', Icon: HardHat, color: '#d97706' },
    { id: '5', name: 'Manufacturing', Icon: Factory, color: '#475569' },
    { id: '6', name: 'FMCG', Icon: Package, color: '#e11d48' },
    { id: '7', name: 'Automotive', Icon: Car, color: '#0d9488' },
    { id: '8', name: 'Chemicals', Icon: FlaskConical, color: '#9333ea' },
    { id: '9', name: 'Metals & Mining', Icon: Hammer, color: '#854d0e' },
    { id: '10', name: 'Other', Icon: HelpCircle, color: '#0891b2' },
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
      const primaryIndustry = selectedIndustries[0];
      onNavigate('Dashboard', { 
        ...routeData, 
        industry: primaryIndustry.name,
        industryColor: primaryIndustry.color,
        allIndustries: selectedIndustries.map(i => i.name).join(', ')
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonCircle}
          onPress={() => onNavigate('Login')}
        >
          <ArrowLeft size={18} color="#1A1D1F" />
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
            const Icon = item.Icon;
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
                  <Icon size={24} color={isSelected ? '#4F46E5' : item.color} />
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
    backgroundColor: '#F4F6FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: '#F4F6FB',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8ECF0',
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
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
    borderColor: '#2327D8',
    backgroundColor: '#EEF2FE',
    shadowColor: '#2327D8',
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
    color: '#2327D8',
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
    backgroundColor: '#2327D8',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2327D8',
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
