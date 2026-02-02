async function testWordPressContent() {
  const response = await fetch('https://mumnhun.id/wp-json/wp/v2/posts?slug=beli-freezer-asi-second-ini-5-fakta-yang-jarang-dibahas-sebelum-mums-menyesal');
  const data = await response.json();
  
  if (data[0]) {
    console.log('=== ORIGINAL CONTENT STRUCTURE ===');
    console.log(data[0].content.rendered.substring(0, 3000));
    console.log('\n\n=== CHECKING FOR HEADINGS ===');
    const hasH2 = data[0].content.rendered.includes('<h2');
    const hasH3 = data[0].content.rendered.includes('<h3');
    const hasH4 = data[0].content.rendered.includes('<h4');
    console.log('Has H2:', hasH2);
    console.log('Has H3:', hasH3);
    console.log('Has H4:', hasH4);
  }
}

testWordPressContent();
