import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, CATEGORIES, ComplaintCategory } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState } from '@/components/ui';
import {
  ChevronLeft,
  Camera,
  X,
  MapPin,
  Tag,
  FileText,
  Send,
  Image as ImageIcon,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportProblemScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function pickImage() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera roll permission is needed to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function handleWebFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageUri(URL.createObjectURL(file));
    }
    e.target.value = '';
  }

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title for your complaint.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter the location of the problem.');
      return;
    }

    setLoading(true);
    try {
      let image_url: string | null = null;
      let image_path: string | null = null;

      if (imageUri) {
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
        const formData = {
          uri: imageUri,
          name: fileName,
          type: `image/${fileExt}`,
        } as any;

        const { error: uploadError } = await supabase.storage
          .from('complaints')
          .upload(fileName, formData);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('complaints').getPublicUrl(fileName);
        image_url = urlData.publicUrl;
        image_path = fileName;
      }

      const { error: insertError } = await supabase.from('complaints').insert({
        title: title.trim(),
        category,
        description: description.trim() || null,
        location: location.trim(),
        image_url,
        image_path,
        status: 'reported',
      });

      if (insertError) throw insertError;

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit complaint. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Submitting your complaint..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileChange}
        />
      )}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Report a Problem</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>
              <Tag size={14} color={theme.colors.textSecondary} /> Title
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Broken ceiling fan"
              placeholderTextColor={theme.colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <MapPin size={14} color={theme.colors.textSecondary} /> Location
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Classroom 204, Block B"
              placeholderTextColor={theme.colors.textTertiary}
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <FileText size={14} color={theme.colors.textSecondary} /> Description (optional)
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add more details about the problem..."
              placeholderTextColor={theme.colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <ImageIcon size={14} color={theme.colors.textSecondary} /> Photo (optional)
            </Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <X size={16} color={theme.colors.white} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
                  <Camera size={20} color={theme.colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.imagePickerText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <ImageIcon size={20} color={theme.colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.imagePickerText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <Send size={20} color={theme.colors.white} strokeWidth={2} />
            <Text style={styles.submitButtonText}>Submit Complaint</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.error,
  },
  field: {
    marginBottom: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.neutral[700],
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.neutral[700],
  },
  categoryChipTextActive: {
    color: theme.colors.white,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[700],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    height: 56,
    marginTop: 16,
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
