import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  Image, ActivityIndicator, Dimensions,
} from 'react-native'
import { useProgressPhotos } from '@/hooks/useBodyComposition'
import { useTheme } from '@/lib/ThemeContext'

function PhotosModalImpl({ visible, onClose }: any) {
  const { colors } = useTheme()
  const { photos, loading, uploading, uploadPhoto, takePhoto, deletePhoto } = useProgressPhotos()
  const [viewingPhoto, setViewingPhoto]   = useState<any>(null)
  const [compareMode, setCompareMode]     = useState(false)
  const [comparePhotos, setComparePhotos] = useState<any[]>([])

  const handleDelete = (photo: any) => {
    Alert.alert('Delete Photo', 'Remove this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(photo) },
    ])
  }

  const handleAdd = () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: () => takePhoto() },
      { text: 'Photo Library', onPress: () => uploadPhoto() },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const toggleCompare = (photo: any) => {
    setComparePhotos(prev => {
      const exists = prev.find(p => p.id === photo.id)
      if (exists) return prev.filter(p => p.id !== photo.id)
      if (prev.length >= 2) return [prev[1], photo]
      return [...prev, photo]
    })
  }

  const screenW = Dimensions.get('window').width
  const padding = 16 * 2
  const cols    = 3
  const gap     = 8
  const thumbW  = Math.floor((screenW - padding - gap * (cols - 1)) / cols)
  const thumbH  = Math.floor(thumbW * 1.33)
  const halfW   = Math.floor((screenW - padding - gap) / 2)
  const halfH   = Math.floor(halfW * 1.33)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontFamily: 'BebasNeue', fontSize: 22, color: colors.text, letterSpacing: 1 }}>
            {compareMode ? 'SELECT 2 PHOTOS' : `PROGRESS PHOTOS${photos.length > 0 ? ` (${photos.length})` : ''}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {photos.length >= 2 && (
              <TouchableOpacity onPress={() => { setCompareMode(v => !v); setComparePhotos([]) }}>
                <Text style={{ fontFamily: 'DMMono', fontSize: 11, color: compareMode ? colors.danger : colors.pull }}>
                  {compareMode ? 'Cancel' : 'Compare'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.pull }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {compareMode && comparePhotos.length === 2 && (
          <View style={{ flexDirection: 'row', padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {comparePhotos.map((photo) => (
              <View key={photo.id} style={{ flex: 1 }}>
                <Image source={{ uri: photo.public_url }} style={{ width: halfW, height: halfH, borderRadius: 10 }} resizeMode="cover" />
                <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                  {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {!compareMode && (
            <TouchableOpacity onPress={handleAdd} disabled={uploading}
              style={{ borderRadius: 6, paddingVertical: 16, alignItems: 'center', marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
              {uploading
                ? <ActivityIndicator color={colors.muted} />
                : <Text style={{ fontFamily: 'DMSans_500', fontSize: 14, color: colors.muted }}>+ Add Photo</Text>}
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator color={colors.muted} style={{ marginTop: 40 }} />
          ) : photos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📸</Text>
              <Text style={{ fontFamily: 'BebasNeue', fontSize: 20, color: colors.text, letterSpacing: 1 }}>NO PHOTOS YET</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                {'Track your physique over time.\nPhotos are stored privately.'}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(photos as any[]).map((photo: any, idx: number) => {
                const col        = idx % cols
                const isSelected = comparePhotos.some(p => p.id === photo.id)
                const marginRight  = col < cols - 1 ? gap : 0
                return (
                  <TouchableOpacity key={photo.id}
                    onPress={() => compareMode ? toggleCompare(photo) : setViewingPhoto(photo)}
                    onLongPress={() => !compareMode && handleDelete(photo)}
                    style={{ width: thumbW, height: thumbH, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.card, marginRight, marginBottom: gap, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? colors.pull : colors.border }}>
                    <Image source={{ uri: photo.public_url }} style={{ width: thumbW, height: thumbH }} resizeMode="cover" />
                    {isSelected && (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 6, backgroundColor: colors.pull, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, color: colors.bg }}>{'✓'}</Text>
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4 }}>
                      <Text style={{ fontFamily: 'DMMono', fontSize: 8, color: '#fff', textAlign: 'center' }}>
                        {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {!compareMode && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.border, textAlign: 'center', marginTop: 20 }}>
              LONG PRESS TO DELETE
            </Text>
          )}
          {compareMode && (
            <Text style={{ fontFamily: 'DMMono', fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 20 }}>
              {comparePhotos.length === 0 ? 'TAP ANY 2 PHOTOS TO COMPARE' : comparePhotos.length === 1 ? 'TAP ONE MORE PHOTO' : 'COMPARISON SHOWN ABOVE'}
            </Text>
          )}
        </ScrollView>
      </View>

      <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setViewingPhoto(null)} activeOpacity={1}>
          {viewingPhoto && (
            <>
              <Image source={{ uri: viewingPhoto.public_url }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
              <Text style={{ fontFamily: 'DMMono', fontSize: 12, color: '#fff', marginTop: 16 }}>
                {new Date(viewingPhoto.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => { handleDelete(viewingPhoto); setViewingPhoto(null) }}
                style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.danger + '60' }}>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.danger }}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  )
}

export const PhotosModal = React.memo(PhotosModalImpl)
