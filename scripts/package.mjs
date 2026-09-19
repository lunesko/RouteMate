#!/usr/bin/env node
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const outputDir = path.join(projectDir, "dist");
const manifest = JSON.parse(readFileSync(path.join(projectDir, "manifest.json"), "utf8"));
const version = manifest.version;
const extensionArchive = path.join(outputDir, `routemate-extension-v${version}.zip`);
const sourceArchive = path.join(outputDir, `RouteMate-field-workspace-source-v${version}.zip`);

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toZipPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function readProjectFiles() {
  const files = [];
  const ignoredRootDirectories = new Set([".git", "dist", "node_modules"]);
  const walk = (relativeDir = "") => {
    const absoluteDir = path.join(projectDir, relativeDir);
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const relativePath = path.join(relativeDir, entry.name);
      const zipPath = toZipPath(relativePath);
      if (entry.isDirectory()) {
        if (!relativeDir && ignoredRootDirectories.has(entry.name)) continue;
        walk(relativePath);
      } else if (entry.isFile()) {
        files.push({ absolutePath: path.join(projectDir, relativePath), zipPath });
      }
    }
  };
  walk();
  return files.sort((a, b) => a.zipPath.localeCompare(b.zipPath));
}

function isExtensionFile(file) {
  if (file.zipPath === "manifest.json" || file.zipPath === "service-worker.js") return true;
  if (file.zipPath === "assets/icon.svg") return false;
  return ["assets/", "content/", "shared/", "sidepanel/"].some((prefix) => file.zipPath.startsWith(prefix));
}

function isSourceFile(file) {
  return ![".git/", "dist/", "node_modules/"].some((prefix) => file.zipPath.startsWith(prefix));
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(files, archivePath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const input = readFileSync(file.absolutePath);
    const compressed = deflateRawSync(input, { level: 9 });
    const stored = compressed.length >= input.length;
    const payload = stored ? input : compressed;
    const compressionMethod = stored ? 0 : 8;
    const name = Buffer.from(file.zipPath, "utf8");
    const { date, time } = dosDateTime(statSync(file.absolutePath).mtime);
    const crc = crc32(input);
    const localOffset = offset;

    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(compressionMethod),
      writeUInt16(time),
      writeUInt16(date),
      writeUInt32(crc),
      writeUInt32(payload.length),
      writeUInt32(input.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name
    ]);

    localParts.push(localHeader, payload);
    offset += localHeader.length + payload.length;

    centralParts.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(compressionMethod),
      writeUInt16(time),
      writeUInt16(date),
      writeUInt32(crc),
      writeUInt32(payload.length),
      writeUInt32(input.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(localOffset),
      name
    ]));
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0)
  ]);

  const archive = Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
  writeFileSync(archivePath, archive);
  return archive;
}

function verifyZip(archivePath) {
  const archive = readFileSync(archivePath);
  const signature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdOffset = archive.lastIndexOf(signature);
  if (eocdOffset < 0) throw new Error(`ZIP end record not found: ${archivePath}`);

  const entryCount = archive.readUInt16LE(eocdOffset + 10);
  const centralOffset = archive.readUInt32LE(eocdOffset + 16);
  let cursor = centralOffset;
  const names = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${index + 1}: ${archivePath}`);
    }
    const method = archive.readUInt16LE(cursor + 10);
    const expectedCrc = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    names.push(name);

    if (archive.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${name}: ${archivePath}`);
    }
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = archive.subarray(dataStart, dataStart + compressedSize);
    const inflated = method === 8 ? inflateRawSync(data) : data;
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method for ${name}`);
    if (inflated.length !== uncompressedSize) throw new Error(`Size mismatch for ${name}`);
    if (crc32(inflated) !== expectedCrc) throw new Error(`CRC mismatch for ${name}`);

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return names;
}

mkdirSync(outputDir, { recursive: true });
for (const archivePath of [extensionArchive, sourceArchive]) {
  if (existsSync(archivePath)) rmSync(archivePath);
}

const allFiles = readProjectFiles();
const extensionFiles = allFiles.filter(isExtensionFile);
const sourceFiles = allFiles.filter(isSourceFile);

createZip(extensionFiles, extensionArchive);
createZip(sourceFiles, sourceArchive);

const verifiedExtensionFiles = verifyZip(extensionArchive);
const verifiedSourceFiles = verifyZip(sourceArchive);

console.log(extensionArchive);
console.log(`${verifiedExtensionFiles.length} extension files verified`);
console.log(sourceArchive);
console.log(`${verifiedSourceFiles.length} source files verified`);
