function rewriteHeroImage(src) {
  if (!src || src.startsWith('http')) return src;
  const region = 'ap-east-1';
  const bucket = 'itsquareupdatedcontent';
  const cleanSrc = src.replace(/^\/?/, '');
  const normalized = cleanSrc.replace(/^(?:static\/)?(?:content\/)?/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com/static/${normalized}`;
}

console.log('Testing rewriteHeroImage function:');
console.log('Input: https://itsquareupdatedcontent.s3.ap-east-1.amazonaws.com/static/images/blog/2025/08/20250820polyusaif1.webp');
console.log('Output:', rewriteHeroImage('https://itsquareupdatedcontent.s3.ap-east-1.amazonaws.com/static/images/blog/2025/08/20250820polyusaif1.webp'));
console.log('');
console.log('Input: /images/blog/2025/08/20250820polyusaif1.webp');
console.log('Output:', rewriteHeroImage('/images/blog/2025/08/20250820polyusaif1.webp'));
