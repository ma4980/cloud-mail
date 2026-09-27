<template>
  <div class="content-box" ref="contentBox">
    <div v-if="blockedRemoteImages > 0 && !allowRemoteImages" class="remote-image-warning">
      <span>{{ t('remoteImagesBlocked', {count: blockedRemoteImages}) }}</span>
      <button type="button" @click="showRemoteImages">{{ t('showRemoteImages') }}</button>
    </div>
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import DOMPurify from 'dompurify'
import {useI18n} from 'vue-i18n'
import {isRemoteUrl} from '@/utils/remote-content-utils.js'

const props = defineProps({
  html: {
    type: String,
    required: true
  }
})

const container = ref(null)
const contentBox = ref(null)
const blockedRemoteImages = ref(0)
const allowRemoteImages = ref(false)
const {t} = useI18n()
let shadowRoot = null

function blockRemoteResources(document) {
  let blocked = 0
  document.querySelectorAll('*').forEach(element => {
    for (const attribute of ['src', 'poster', 'background', 'xlink:href']) {
      const value = element.getAttribute(attribute)
      if (isRemoteUrl(value)) {
        element.removeAttribute(attribute)
        blocked++
      }
    }
    const srcset = element.getAttribute('srcset')
    if (srcset && srcset.split(',').some(item => isRemoteUrl(item.trim().split(/\s+/)[0]))) {
      element.removeAttribute('srcset')
      blocked++
    }
    const style = element.getAttribute('style')
    if (style && /url\s*\(\s*['"]?https?:\/\//i.test(style)) {
      element.setAttribute('style', style.replace(/url\s*\([^)]*\)/gi, 'none'))
      blocked++
    }
  })
  return blocked
}

function showRemoteImages() {
  allowRemoteImages.value = true
  updateContent()
  autoScale()
}

function updateContent() {
  if (!shadowRoot) return;

  const sanitizedDocument = DOMPurify.sanitize(props.html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'base', 'link'],
    FORBID_ATTR: ['srcdoc', 'ping'],
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
  const sanitizedBody = sanitizedDocument.querySelector('body');
  blockedRemoteImages.value = allowRemoteImages.value ? 0 : blockRemoteResources(sanitizedBody || sanitizedDocument)
  const bodyStyle = sanitizedBody?.getAttribute('style')
    ?.replace(/(?:url|expression|@import)\s*\([^)]*\)/gi, '') || '';
  const cleanedHtml = sanitizedBody?.innerHTML || '';

  // 3. 将 body 的 style 应用到 .shadow-content
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        width: 100%;
        height: 100%;
        font-family: Inter, 'Helvetica Neue', Helvetica, 'PingFang SC',
                    'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #13181D;
        word-break: break-word;
      }

      h1, h2, h3, h4 {
          font-size: 18px;
          font-weight: 700;
      }

      p {
        margin: 0;
      }

      a {
        text-decoration: none;
        color: #0E70DF;
      }

      .shadow-content {
        background: #FFFFFF;
        width: fit-content;
        height: fit-content;
        min-width: 100%;
      }

      img:not(table img) {
        max-width: 100%;
        height: auto !important;
      }

    </style>
    <div class="shadow-content">
      ${cleanedHtml}
    </div>
  `;

  if (bodyStyle) shadowRoot.querySelector('.shadow-content')?.setAttribute('style', bodyStyle);
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return

  const parent = contentBox.value
  const shadowContent = shadowRoot.querySelector('.shadow-content')

  if (!shadowContent) return

  const parentWidth = parent.offsetWidth
  const childWidth = shadowContent.scrollWidth

  if (childWidth === 0) return

  const scale = parentWidth / childWidth

  const hostElement = shadowRoot.host
  hostElement.style.zoom = scale
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'open' })
  updateContent()
  autoScale()
})

watch(() => props.html, () => {
  allowRemoteImages.value = false
  updateContent()
  autoScale()
})
</script>

<style scoped>
.content-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

.remote-image-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 6px;
  color: var(--el-text-color-regular);
  background: var(--el-color-warning-light-9);
  font-size: 13px;
}

.remote-image-warning button {
  flex: none;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font: inherit;
}

.content-html {
  width: 100%;
  height: 100%;
}
</style>
