function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    return copied
      ? Promise.resolve(text)
      : Promise.reject(new Error('Copy command failed'));
  } finally {
    document.body.removeChild(textarea);
  }
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => text);
  }
  return fallbackCopyText(text);
}

export default {
  install(app) {
    app.config.globalProperties.$copyText = copyText;
  },
};
