<template>
  <div class="profileEdit">
    <h2 class="heading">
      {{ editOrCreateProfileLabel }}
    </h2>
    <section class="section">
      <h3 class="sectionHeading">
        {{ editOrCreateProfileNameLabel }}
      </h3>
      <FtInput
        class="profileName"
        :placeholder="$t('Profile.Profile Name')"
        :disabled="isMainProfile"
        :value="translatedProfileName"
        :show-action-button="false"
        :maxlength="100"
        @input="profileName = $event"
        @keydown.enter="saveProfile"
      />
    </section>
    <section class="section">
      <h3 class="sectionHeading">
        {{ $t("Profile.Color Picker") }}
      </h3>
      <div class="colorOptions">
        <div
          v-for="color in COLOR_VALUES"
          :key="color"
          class="colorOption"
          :class="{ chosen: color === profileBgColor }"
          :title="color"
          :style="{ background: color, color: calculateColorLuminance(color) }"
          tabindex="0"
          role="button"
          :aria-pressed="color === profileBgColor"
          @click="profileBgColor = color"
          @keydown.enter.space.prevent="profileBgColor = color"
        >
          <FontAwesomeIcon
            v-if="color === profileBgColor"
            :icon="['fas', 'check']"
          />
        </div>
      </div>
      <div class="customColorSection">
        <label for="colorPicker">{{ $t("Profile.Custom Color") }}</label>
        <input
          id="colorPicker"
          v-model="profileBgColor"
          type="color"
        >
        <span class="colorValue">{{ profileBgColor }}</span>
      </div>
    </section>
    <section class="section">
      <h3 class="sectionHeading">
        {{ $t("Profile.Profile Preview") }}
      </h3>
      <div class="previewRow">
        <div
          class="preview"
          :style="{ background: profileBgColor, color: profileTextColor }"
        >
          <span
            class="initial"
            dir="auto"
          >
            {{ profileInitial }}
          </span>
        </div>
        <div class="actions">
          <FtButton
            v-if="isNew"
            :label="$t('Profile.Create Profile')"
            @click="saveProfile"
          />
          <template
            v-else
          >
            <FtButton
              :label="$t('Profile.Update Profile')"
              @click="saveProfile"
            />
            <FtButton
              :label="$t('Profile.Make Default Profile')"
              :background-color="NEUTRAL_BUTTON_COLOR"
              text-color="var(--primary-text-color)"
              @click="setDefaultProfile"
            />
            <FtButton
              v-if="!isMainProfile"
              :label="$t('Profile.Delete Profile')"
              text-color="var(--destructive-text-color)"
              background-color="var(--destructive-color)"
              :icon="['fas', 'trash']"
              @click="showDeletePrompt = true"
            />
          </template>
        </div>
      </div>
    </section>
    <FtPrompt
      v-if="showDeletePrompt"
      :label="deletePromptLabel"
      :option-names="deletePromptNames"
      :option-values="DELETE_PROMPT_VALUES"
      :is-first-option-destructive="true"
      @click="handleDeletePrompt"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtButton from '../FtButton/FtButton.vue'

import store from '../../store/index'

import { MAIN_PROFILE_ID } from '../../../constants'
import { calculateColorLuminance, colors } from '../../helpers/colors'
import { deepCopy, showToast } from '../../helpers/utils'
import { getFirstCharacter } from '../../helpers/strings'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 * @property {object[]} subscriptions
 * @property {string} subscriptions[].id
 * @property {string|undefined} subscriptions[].name
 * @property {string|undefined} subscriptions[].thumbnail
 */

const { locale, t } = useI18n()

const props = defineProps({
  isMainProfile: {
    type: Boolean,
    required: true
  },
  isNew: {
    type: Boolean,
    required: true
  },
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['new-profile-created', 'profile-deleted'])

const COLOR_VALUES = colors.map(color => color.value)

/** Mild, for the actions that aren't the main (or destructive) one */
const NEUTRAL_BUTTON_COLOR = 'color-mix(in srgb, var(--primary-text-color) 12%, transparent)'

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

/** @type {import('vue').Ref<string | undefined>} */
const profileId = ref(props.profile._id)

/** @type {import('vue').Ref<string>} */
const profileName = ref(props.profile.name)

/** @type {import('vue').Ref<string>} */
const profileBgColor = ref(props.profile.bgColor)

/** @type {import('vue').Ref<string>} */
const profileTextColor = ref(props.profile.textColor)

watch(profileBgColor, (value) => {
  profileTextColor.value = calculateColorLuminance(value)
})

const translatedProfileName = computed(() => {
  return props.isMainProfile ? t('Profile.All Channels') : profileName.value
})

const profileInitial = computed(() => {
  return profileName.value
    ? getFirstCharacter(translatedProfileName.value, locale.value)
    : ''
})

const editOrCreateProfileLabel = computed(() => {
  return props.isNew ? t('Profile.Create Profile') : t('Profile.Edit Profile')
})

const editOrCreateProfileNameLabel = computed(() => {
  return props.isNew ? t('Profile.Create Profile Name') : t('Profile.Edit Profile Name')
})

function saveProfile() {
  if (profileName.value === '') {
    showToast(t('Profile.Your profile name cannot be empty'))
    return
  }

  const profile = {
    name: profileName.value,
    bgColor: profileBgColor.value,
    textColor: profileTextColor.value,
    subscriptions: deepCopy(props.profile.subscriptions)
  }

  if (!props.isNew) {
    profile._id = profileId.value
  }

  if (props.isNew) {
    store.dispatch('createProfile', profile)
    showToast(t('Profile.Profile has been created'))
    emit('new-profile-created')
  } else {
    store.dispatch('updateProfile', profile)
    showToast(t('Profile.Profile has been updated'))
  }
}

function setDefaultProfile() {
  store.dispatch('updateDefaultProfile', profileId.value)
  showToast(t('Profile.Your default profile has been set to {profile}', { profile: translatedProfileName.value }))
}

const DELETE_PROMPT_VALUES = ['delete', 'cancel']

const deletePromptNames = computed(() => [
  t('Yes, Delete'),
  t('Cancel')
])

const deletePromptLabel = computed(() => {
  return `${t('Profile.Are you sure you want to delete this profile?')} ${t('Profile["All subscriptions will also be deleted."]')}`
})

const showDeletePrompt = ref(false)

/** @type {import('vue').ComputedRef<string>} */
const defaultProfile = computed(() => store.getters.getDefaultProfile)

/**
 * @param {'delete' | 'cancel' | null} response
 */
function handleDeletePrompt(response) {
  if (response === 'delete') {
    if (activeProfile.value._id === profileId.value) {
      store.dispatch('updateActiveProfile', MAIN_PROFILE_ID)
    }

    store.dispatch('removeProfile', profileId.value)

    showToast(t('Profile.Removed {profile} from your profiles', { profile: translatedProfileName.value }))

    if (defaultProfile.value === profileId.value) {
      store.dispatch('updateDefaultProfile', MAIN_PROFILE_ID)
      showToast(t('Profile.Your default profile has been changed to your primary profile'))
    }

    emit('profile-deleted')
  } else {
    showDeletePrompt.value = false
  }
}
</script>

<style scoped src="./FtProfileEdit.css" />
