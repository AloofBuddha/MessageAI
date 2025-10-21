import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { signup, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  
  const validateForm = (): boolean => {
    if (!displayName.trim()) {
      setLocalError('Please enter your display name');
      return false;
    }
    
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    
    if (!password) {
      setLocalError('Please enter a password');
      return false;
    }
    
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };
  
  const handleSignup = async () => {
    // Clear previous errors
    setLocalError('');
    clearError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      await signup(email.trim(), password, displayName.trim());
      // Navigation will be handled by the root layout based on auth state
    } catch (err: any) {
      // Error is already set in the store
      console.error('Signup error:', err);
    }
  };
  
  const navigateToLogin = () => {
    clearError();
    router.push('/login');
  };
  
  const displayError = localError || error;
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text variant="headlineLarge" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign up to get started
          </Text>
          
          <View style={styles.form}>
            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              autoCapitalize="words"
              autoComplete="name"
              disabled={isLoading}
              error={!!displayError}
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={isLoading}
              error={!!displayError}
              style={styles.input}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              disabled={isLoading}
              error={!!displayError}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />
            
            <HelperText type="info" visible={!password || password.length < 6}>
              Password must be at least 6 characters
            </HelperText>
            
            {displayError && (
              <HelperText type="error" visible={!!displayError}>
                {displayError}
              </HelperText>
            )}
            
            <Button
              mode="contained"
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Sign Up
            </Button>
            
            <View style={styles.loginContainer}>
              <Text variant="bodyMedium">Already have an account? </Text>
              <Button
                mode="text"
                onPress={navigateToLogin}
                disabled={isLoading}
                compact
              >
                Login
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

