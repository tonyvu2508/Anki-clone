const yauzl = require('yauzl');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Parse Anki .apkg file
 * .apkg is a zip file containing:
 * - collection.anki2 (SQLite database)
 * - media file (JSON mapping)
 * - media files (images, audio, video)
 */
class ApkgParser {
  constructor(apkgPath, outputDir) {
    this.apkgPath = apkgPath;
    this.outputDir = outputDir;
    this.tempDir = path.join(outputDir, 'temp');
    this.mediaDir = path.join(outputDir, 'media');
  }

  /**
   * Extract .apkg file
   */
  async extract() {
    return new Promise((resolve, reject) => {
      // Create temp directory
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      if (!fs.existsSync(this.mediaDir)) {
        fs.mkdirSync(this.mediaDir, { recursive: true });
      }

      yauzl.open(this.apkgPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
          } else {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);

              const filePath = path.join(this.tempDir, entry.fileName);
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }

              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);
              readStream.on('end', () => {
                zipfile.readEntry();
              });
            });
          }
        });

        zipfile.on('end', () => {
          resolve(this.tempDir);
        });

        zipfile.on('error', reject);
      });
    });
  }

  /**
   * Parse collection.anki2 SQLite database
   */
  parseDatabase() {
    const dbPath = path.join(this.tempDir, 'collection.anki2');
    if (!fs.existsSync(dbPath)) {
      throw new Error('collection.anki2 not found in apkg file');
    }

    const db = new Database(dbPath, { readonly: true });

    // First, check what tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Available tables:', tables.map(t => t.name));

    // Get notes (main data)
    let notes = [];
    try {
      notes = db.prepare('SELECT * FROM notes').all();
    } catch (e) {
      console.warn('Could not read notes table:', e.message);
    }
    
    // Get cards (for SRS data if needed)
    let cards = [];
    try {
      cards = db.prepare('SELECT * FROM cards').all();
    } catch (e) {
      console.warn('Could not read cards table:', e.message);
    }
    
    // Get models (note types) - try different table names
    let models = [];
    try {
      // Try 'notetypes' first (newer Anki versions)
      models = db.prepare('SELECT * FROM notetypes').all();
    } catch (e) {
      try {
        // Try 'models' (older Anki versions)
        models = db.prepare('SELECT * FROM models').all();
      } catch (e2) {
        console.warn('Could not read models/notetypes table:', e2.message);
        // If no models table, create empty array
        models = [];
      }
    }

    // Parse media mapping
    let mediaMapping = {};
    const mediaPath = path.join(this.tempDir, 'media');
    if (fs.existsSync(mediaPath)) {
      try {
        const mediaContent = fs.readFileSync(mediaPath, 'utf8');
        mediaMapping = JSON.parse(mediaContent);
      } catch (e) {
        console.warn('Could not parse media file:', e.message);
      }
    }

    db.close();

    return {
      notes,
      cards,
      models,
      mediaMapping
    };
  }

  /**
   * Convert Anki note to our card format
   */
  convertNoteToCard(note, model, mediaMapping) {
    // Parse note fields (separated by \x1f character in Anki)
    const fields = note.flds ? note.flds.split('\x1f') : [];
    
    // Get model to understand field structure (if available)
    let modelFields = [];
    if (model) {
      try {
        // Model fields might be in different formats
        if (typeof model.flds === 'string') {
          modelFields = JSON.parse(model.flds);
        } else if (Array.isArray(model.flds)) {
          modelFields = model.flds;
        }
      } catch (e) {
        console.warn('Could not parse model fields:', e.message);
      }
    }
    
    // Extract front and back (usually first two fields)
    // Keep original HTML for media extraction
    const frontHtml = fields[0] || '';
    const backHtml = fields[1] || fields.slice(1).join(' ') || ''; // Join all remaining fields if no second field
    
    // Extract media from fields (before cleaning HTML)
    const frontMedia = this.extractMedia(frontHtml, mediaMapping);
    const backMedia = this.extractMedia(backHtml, mediaMapping);
    
    // Clean HTML tags but preserve structure for display
    let front = this.cleanHtml(frontHtml);
    let back = this.cleanHtml(backHtml);
    
    // If cleaned text is empty, use original HTML
    if (!front.trim()) front = frontHtml || '(Empty)';
    if (!back.trim()) back = backHtml || '(Empty)';
    
    // Ensure both front and back have at least some content
    if (!front || front.trim().length === 0) {
      front = '(Empty)';
    }
    if (!back || back.trim().length === 0) {
      back = '(Empty)';
    }

    // Parse tags (Anki uses space-separated tags with optional prefix)
    let tags = [];
    if (note.tags) {
      tags = note.tags
        .split(' ')
        .map(t => t.trim())
        .filter(t => t && t.length > 0);
    }

    return {
      front,
      back,
      frontHtml, // Keep original for media references
      backHtml,
      frontMedia,
      backMedia,
      tags,
      // Map Anki card data if available
      interval: 0,
      ef: 2.5,
      repetitions: 0,
      dueDate: new Date()
    };
  }

  /**
   * Extract media references from HTML/text
   */
  extractMedia(text, mediaMapping) {
    const media = [];
    const foundFiles = new Set(); // Avoid duplicates
    
    if (!text) return media;

    // Match <img src="...">, <audio src="...">, <video src="...">
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const audioRegex = /<audio[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const soundRegex = /\[sound:([^\]]+)\]/gi;

    // Extract images
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
      const filename = match[1];
      if (foundFiles.has(filename)) continue;
      foundFiles.add(filename);
      
      // Map filename using media mapping
      const mappedFile = mediaMapping[filename] || filename;
      const filePath = path.join(this.tempDir, mappedFile);
      
      if (fs.existsSync(filePath)) {
        media.push({
          type: 'image',
          filename: mappedFile,
          originalFilename: filename
        });
      }
    }

    // Extract audio from <audio> tags
    while ((match = audioRegex.exec(text)) !== null) {
      const filename = match[1];
      if (foundFiles.has(filename)) continue;
      foundFiles.add(filename);
      
      const mappedFile = mediaMapping[filename] || filename;
      const filePath = path.join(this.tempDir, mappedFile);
      
      if (fs.existsSync(filePath)) {
        media.push({
          type: 'audio',
          filename: mappedFile,
          originalFilename: filename
        });
      }
    }

    // Extract [sound:...] syntax (Anki format)
    while ((match = soundRegex.exec(text)) !== null) {
      const filename = match[1];
      if (foundFiles.has(filename)) continue;
      foundFiles.add(filename);
      
      const mappedFile = mediaMapping[filename] || filename;
      const filePath = path.join(this.tempDir, mappedFile);
      
      if (fs.existsSync(filePath)) {
        media.push({
          type: 'audio',
          filename: mappedFile,
          originalFilename: filename
        });
      }
    }

    // Extract video
    while ((match = videoRegex.exec(text)) !== null) {
      const filename = match[1];
      if (foundFiles.has(filename)) continue;
      foundFiles.add(filename);
      
      const mappedFile = mediaMapping[filename] || filename;
      const filePath = path.join(this.tempDir, mappedFile);
      
      if (fs.existsSync(filePath)) {
        media.push({
          type: 'video',
          filename: mappedFile,
          originalFilename: filename
        });
      }
    }

    return media;
  }

  /**
   * Clean HTML tags (basic)
   */
  cleanHtml(html) {
    if (!html) return '';
    // Remove HTML tags but keep content
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Copy media files to permanent storage
   */
  async copyMediaFiles(mediaItems, userId) {
    const copiedFiles = [];
    
    for (const media of mediaItems) {
      const sourcePath = path.join(this.tempDir, media.filename);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`Media file not found: ${media.filename}`);
        continue;
      }

      // Create user-specific media directory
      const userMediaDir = path.join(this.mediaDir, userId.toString());
      if (!fs.existsSync(userMediaDir)) {
        fs.mkdirSync(userMediaDir, { recursive: true });
      }

      // Generate unique filename (preserve extension)
      const ext = path.extname(media.filename);
      const baseName = path.basename(media.filename, ext);
      const uniqueFilename = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const destPath = path.join(userMediaDir, uniqueFilename);

      // Copy file
      fs.copyFileSync(sourcePath, destPath);

      copiedFiles.push({
        type: media.type,
        url: `/api/media/${userId}/${uniqueFilename}`,
        filename: uniqueFilename
      });
    }

    return copiedFiles;
  }

  /**
   * Cleanup temp files
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = ApkgParser;

