#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

const ADDON_NAME = "LifeSteal"; // Change this if needed
const BASE_DIR = __dirname;
const BP_DIR = path.join(BASE_DIR, `${ADDON_NAME} BP`);
const RP_DIR = path.join(BASE_DIR, `${ADDON_NAME} RP`);
const MANIFEST_PATH = path.join(BP_DIR, "manifest.json");
const OUTPUT_FOLDER = path.join(BASE_DIR, "build");
const TEMP_FOLDER = path.join(OUTPUT_FOLDER, "temp");

async function getAddonVersion() {
    try {
        const manifest = await fs.readJson(MANIFEST_PATH);
        const versionArray = manifest.header.version;
        if (!Array.isArray(versionArray) || versionArray.length < 3) {
            throw new Error("Invalid version format in manifest.json");
        }
        return `${versionArray[0]}.${versionArray[1]}${versionArray[2]}`;
    } catch (error) {
        console.error("Error reading manifest.json:", error);
        process.exit(1);
    }
}

async function packageAddon() {
    const version = await getAddonVersion();
    const outputName = `${ADDON_NAME} v${version}.mcaddon`;
    const zipPath = path.join(OUTPUT_FOLDER, `${ADDON_NAME}.zip`);
    const mcaddonPath = path.join(OUTPUT_FOLDER, outputName);

    try {
        // Ensure output directory exists
        await fs.ensureDir(OUTPUT_FOLDER);

        // Delete ALL old .mcaddon files
        const files = await fs.readdir(OUTPUT_FOLDER);
        for (const file of files) {
            if (file.endsWith(".mcaddon")) {
                await fs.remove(path.join(OUTPUT_FOLDER, file));
            }
        }

        // Copy folders to temporary location
        await fs.emptyDir(TEMP_FOLDER);
        for (const folder of [BP_DIR, RP_DIR]) {
            if (await fs.pathExists(folder)) {
                const dest = path.join(TEMP_FOLDER, path.basename(folder));
                await fs.copy(folder, dest);
            } else {
                console.warn(`Warning: Folder "${path.basename(folder)}" does not exist!`);
            }
        }

        // Create a ZIP archive
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(TEMP_FOLDER, false);
        await archive.finalize();

        // Rename ZIP to MCADDON
        await fs.rename(zipPath, mcaddonPath);

        // Cleanup temp files
        await fs.remove(TEMP_FOLDER);

        console.log(`Successfully created: ${mcaddonPath}`);
    } catch (error) {
        console.error("Error during packaging:", error);
    }
}

packageAddon();
