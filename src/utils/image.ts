export function resizeImageUrl(imgUrl: string, size = 512): string {
  if (!imgUrl) return '';
  if (/^(data|blob|file):/i.test(imgUrl)) return imgUrl;
  if (imgUrl.startsWith('http://127.0.0.1:')) return imgUrl;
  if (!/^https?:\/\//i.test(imgUrl)) return imgUrl;

  if (imgUrl.includes('/rest/getCoverArt.view')) {
    const url = new URL(imgUrl);
    url.searchParams.set('size', String(size));
    return url.toString();
  }

  const url = new URL(imgUrl.replace(/^http:\/\//i, 'https://'));
  url.searchParams.set('param', `${size}y${size}`);
  return url.toString();
}
