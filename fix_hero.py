with open('app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the section to replace (from line 42 to around line 192)
# Looking for the comment before hero section and the closing </section>

new_lines = []
skip_mode = False
hero_section_start = False

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Detect start of old hero section
    if '/* SECTION 1: HERO - Mockup Design' in line:
        hero_section_start = True
        skip_mode = False
        # Add the new HeroSlider instead
        new_lines.append('      {/* ═══════════════════════════════════════════════════════ */}\n')
        new_lines.append('      {/* HERO SLIDER - Dynamic from Database                    */}\n')
        new_lines.append('      {/* ═══════════════════════════════════════════════════════ */}\n')
        new_lines.append('      <HeroSlider slides={slides} />\n')
        new_lines.append('\n')
        skip_mode = True
        continue
    
    # Detect end of old hero section
    if skip_mode and line.strip() == '</section>' and hero_section_start:
        skip_mode = False
        hero_section_start = False
        continue
    
    # Skip lines in old hero section
    if skip_mode:
        continue
    
    # Keep all other lines
    new_lines.append(line)

# Write back
with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Hero section replaced with HeroSlider!")
print("📄 Old hero section removed (lines 43-192)")
print("🎠 HeroSlider component now rendering")
