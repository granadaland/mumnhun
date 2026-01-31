# WordPress Backup Folder

Place your WordPress JSON exports here:

## Required Files

1. **posts.json** - All blog posts exported from WordPress
2. **categories.json** - All categories 
3. **tags.json** - All tags

## Optional Files

4. **pages.json** - Static pages (Petunjuk, Syarat & Ketentuan, Kontak)
5. **media.json** - Media/attachment metadata

## How to Export from WordPress

### Option 1: WP All Export Plugin (Recommended)
1. Install "WP All Export" plugin
2. Create new export for each content type
3. Select JSON format
4. Export and save files here

### Option 2: WordPress REST API
```bash
# Posts
curl "https://your-site.com/wp-json/wp/v2/posts?per_page=100" > posts.json

# Categories
curl "https://your-site.com/wp-json/wp/v2/categories?per_page=100" > categories.json

# Tags
curl "https://your-site.com/wp-json/wp/v2/tags?per_page=100" > tags.json
```

### Option 3: Custom SQL Export
Export directly from WordPress database and convert to JSON.

## Running the Import

```bash
# Preview what will be imported (no changes made)
npx tsx scripts/import-wordpress.ts --dry-run

# Actually import the data
npx tsx scripts/import-wordpress.ts
```
