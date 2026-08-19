import type { PhotoDateSource } from "./types";

type ExtractedDate = {
  takenAt: string | null;
  source: PhotoDateSource;
};

export function extractTakenAtFromJpeg(buffer: Buffer): ExtractedDate {
  const exif = findExifSegment(buffer);
  if (!exif) {
    return { takenAt: null, source: "unknown" };
  }

  const parsed = readExifDate(exif);
  return parsed ? { takenAt: parsed, source: "exif" } : { takenAt: null, source: "unknown" };
}

export function normalizeManualTakenAt(value: string | undefined): ExtractedDate | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return { takenAt: parsed.toISOString(), source: "manual" };
}

function findExifSegment(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker === 0xe1 && buffer.subarray(offset + 4, offset + 10).toString("ascii") === "Exif\0\0") {
      return buffer.subarray(offset + 10, offset + 2 + length);
    }

    offset += 2 + length;
  }

  return null;
}

function readExifDate(tiff: Buffer) {
  if (tiff.length < 8) {
    return null;
  }

  const littleEndian = tiff.subarray(0, 2).toString("ascii") === "II";
  const readUInt16 = littleEndian ? Buffer.prototype.readUInt16LE : Buffer.prototype.readUInt16BE;
  const readUInt32 = littleEndian ? Buffer.prototype.readUInt32LE : Buffer.prototype.readUInt32BE;

  const magic = readUInt16.call(tiff, 2);
  if (magic !== 42) {
    return null;
  }

  const ifd0Offset = readUInt32.call(tiff, 4);
  const exifIfdOffset = findTagValueOffset(tiff, ifd0Offset, 0x8769, readUInt16, readUInt32);
  const candidates = [
    exifIfdOffset ? readAsciiTag(tiff, exifIfdOffset, 0x9003, readUInt16, readUInt32) : null,
    exifIfdOffset ? readAsciiTag(tiff, exifIfdOffset, 0x9004, readUInt16, readUInt32) : null,
    readAsciiTag(tiff, ifd0Offset, 0x0132, readUInt16, readUInt32)
  ];

  for (const value of candidates) {
    const parsed = parseExifDate(value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function findTagValueOffset(
  tiff: Buffer,
  ifdOffset: number,
  tag: number,
  readUInt16: (this: Buffer, offset: number) => number,
  readUInt32: (this: Buffer, offset: number) => number
) {
  if (ifdOffset <= 0 || ifdOffset + 2 > tiff.length) {
    return null;
  }

  const entries = readUInt16.call(tiff, ifdOffset);
  for (let index = 0; index < entries; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > tiff.length) {
      return null;
    }

    if (readUInt16.call(tiff, entryOffset) === tag) {
      return readUInt32.call(tiff, entryOffset + 8);
    }
  }

  return null;
}

function readAsciiTag(
  tiff: Buffer,
  ifdOffset: number,
  tag: number,
  readUInt16: (this: Buffer, offset: number) => number,
  readUInt32: (this: Buffer, offset: number) => number
) {
  if (ifdOffset <= 0 || ifdOffset + 2 > tiff.length) {
    return null;
  }

  const entries = readUInt16.call(tiff, ifdOffset);
  for (let index = 0; index < entries; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > tiff.length) {
      return null;
    }

    if (readUInt16.call(tiff, entryOffset) !== tag) {
      continue;
    }

    const type = readUInt16.call(tiff, entryOffset + 2);
    const count = readUInt32.call(tiff, entryOffset + 4);
    const valueOffset = count <= 4 ? entryOffset + 8 : readUInt32.call(tiff, entryOffset + 8);
    if (type !== 2 || valueOffset + count > tiff.length) {
      return null;
    }

    return tiff.subarray(valueOffset, valueOffset + count).toString("ascii").replace(/\0+$/, "");
  }

  return null;
}

function parseExifDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}
