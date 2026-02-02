async function checkHeadings() {
  const response = await fetch('https://mumnhun.id/wp-json/wp/v2/posts?slug=beli-freezer-asi-second-ini-5-fakta-yang-jarang-dibahas-sebelum-mums-menyesal');
  const data = await response.json();
  
  if (data[0]) {
    const content = data[0].content.rendered;
    
    // Count headings
    const h2Count = (content.match(/<h2/g) || []).length;
    const h3Count = (content.match(/<h3/g) || []).length;
    const h4Count = (content.match(/<h4/g) || []).length;
    
    console.log('=== HEADING COUNT ===');
    console.log('H2:', h2Count);
    console.log('H3:', h3Count);
    console.log('H4:', h4Count);
    
    // Show first 3 H3s
    const h3Matches = content.match(/<h3[^>]*>.*?<\/h3>/g);
    if (h3Matches) {
      console.log('\n=== SAMPLE H3 TAGS ===');
      h3Matches.slice(0, 3).forEach((h3, i) => {
        console.log(`${i+1}. ${h3}`);
      });
    }
  }
}

checkHeadings();
