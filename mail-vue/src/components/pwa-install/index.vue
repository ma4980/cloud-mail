<template>
  <div v-if="showInstallButton" class="pwa-install">
    <button class="install-button" type="button" :aria-label="t('installApp')" @click="installApp">
      <Icon icon="material-symbols:install-mobile-rounded" width="23" height="23"/>
      <span>{{ t('installApp') }}</span>
    </button>

    <el-dialog v-model="showIosHelp" :title="t('installApp')" width="min(90vw, 380px)" append-to-body>
      <div class="ios-help">
        <img src="/app-icon.svg" alt="Cloud Mail" width="72" height="72">
        <p>{{ t('iosInstallIntro') }}</p>
        <ol>
          <li>{{ t('iosInstallStep1') }}</li>
          <li>{{ t('iosInstallStep2') }}</li>
          <li>{{ t('iosInstallStep3') }}</li>
        </ol>
      </div>
      <template #footer>
        <el-button type="primary" @click="showIosHelp = false">{{ t('confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, shallowRef} from 'vue'
import {Icon} from '@iconify/vue'
import {useI18n} from 'vue-i18n'

const {t} = useI18n()
const deferredPrompt = shallowRef(null)
const installed = ref(false)
const showIosHelp = ref(false)
const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
const standaloneQuery = window.matchMedia('(display-mode: standalone)')

const updateInstalled = () => {
  installed.value = standaloneQuery.matches || window.navigator.standalone === true
}

const beforeInstall = (event) => {
  event.preventDefault()
  deferredPrompt.value = event
}

const appInstalled = () => {
  installed.value = true
  deferredPrompt.value = null
}

const showInstallButton = computed(() => !installed.value && (!!deferredPrompt.value || isIos))

async function installApp() {
  if (!deferredPrompt.value) {
    showIosHelp.value = true
    return
  }

  const prompt = deferredPrompt.value
  deferredPrompt.value = null
  await prompt.prompt()
  const choice = await prompt.userChoice
  if (choice.outcome === 'accepted') installed.value = true
}

onMounted(() => {
  updateInstalled()
  window.addEventListener('beforeinstallprompt', beforeInstall)
  window.addEventListener('appinstalled', appInstalled)
  standaloneQuery.addEventListener?.('change', updateInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', beforeInstall)
  window.removeEventListener('appinstalled', appInstalled)
  standaloneQuery.removeEventListener?.('change', updateInstalled)
})
</script>

<style scoped lang="scss">
.install-button {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(18px, calc(env(safe-area-inset-bottom) + 10px));
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #3298ef, #1769d2);
  box-shadow: 0 8px 24px rgba(23, 105, 210, .32);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.install-button:focus-visible {
  outline: 3px solid rgba(64, 158, 255, .4);
  outline-offset: 3px;
}

.ios-help {
  display: grid;
  justify-items: center;
  color: var(--el-text-color-primary);
  line-height: 1.7;
}

.ios-help img {
  margin-bottom: 6px;
  border-radius: 18px;
}

.ios-help ol {
  width: 100%;
  margin: 6px 0 0;
  padding-left: 24px;
}

@media (min-width: 768px) {
  .install-button span {
    display: inline;
  }
}

@media (max-width: 767px) {
  .install-button {
    right: max(12px, env(safe-area-inset-right));
  }
}
</style>
