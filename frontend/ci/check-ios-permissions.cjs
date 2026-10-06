#!/usr/bin/env node
// Fails when the code uses a privacy-protected iOS feature whose usage
// description is missing from Info.plist. iOS kills the app the moment it
// touches such a feature without one (App Review 2.1(a), build 1.0 (3)).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLIST = path.join(ROOT, 'ios/App/App/Info.plist');
const SCAN_DIRS = ['src', 'ios/App/App'];

// [what the code does, pattern, required Info.plist keys]
const RULES = [
    ['file input offering photos (Take Photo)', /accept=["'{][^"'}]*image\//, ['NSCameraUsageDescription']],
    ['file input offering video', /accept=["'{][^"'}]*video\//, ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']],
    ['file input with capture', /\bcapture=/, ['NSCameraUsageDescription']],
    ['getUserMedia', /getUserMedia\s*\(/, ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']],
    ['geolocation', /navigator\.geolocation|CLLocationManager/, ['NSLocationWhenInUseUsageDescription']],
    ['camera capture', /AVCaptureDevice|UIImagePickerController/, ['NSCameraUsageDescription']],
    ['photo library access', /PHPhotoLibrary/, ['NSPhotoLibraryUsageDescription']],
    ['calendar access', /EKEventStore/, ['NSCalendarsFullAccessUsageDescription', 'NSCalendarsWriteOnlyAccessUsageDescription']],
    ['Face ID', /LAContext/, ['NSFaceIDUsageDescription']],
    ['contacts access', /CNContactStore/, ['NSContactsUsageDescription']],
];

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(jsx?|tsx?|swift|m)$/.test(entry.name)) out.push(full);
    }
    return out;
}

const plist = fs.readFileSync(PLIST, 'utf8');
const hasKey = (key) => {
    const m = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
    return Boolean(m && m[1].trim());
};

const missing = new Map();
for (const file of SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [what, pattern, keys] of RULES) {
        if (!pattern.test(text)) continue;
        for (const key of keys.filter((k) => !hasKey(k))) {
            if (!missing.has(key)) missing.set(key, []);
            missing.get(key).push(`${what} in ${path.relative(ROOT, file)}`);
        }
    }
}

if (missing.size) {
    console.error('Info.plist is missing usage descriptions; iOS will crash the app:');
    for (const [key, uses] of missing) console.error(`  ${key}\n    used by: ${[...new Set(uses)].join(', ')}`);
    process.exit(1);
}
console.log('iOS permission check passed.');
